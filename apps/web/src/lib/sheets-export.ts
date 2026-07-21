import { SURVEY_COLUMNS, type OcrRow } from "@cowell/shared";

export const GOOGLE_SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

export interface SheetsExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  rowCount: number;
}

export interface SheetsExportOptions {
  accessToken: string;
  rows: OcrRow[];
  title: string;
  /** Optional Drive folder to place the new spreadsheet in */
  folderId?: string | null;
}

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function buildSheetValues(rows: OcrRow[]): string[][] {
  const columns = SURVEY_COLUMNS.filter((c) => c !== "写真");
  return [
    [...columns],
    ...rows.map((r) => [
      r.floor,
      r.location,
      r.fixtureModel,
      r.existingProduct,
      r.quantity,
      r.notes,
    ]),
  ];
}

/**
 * Create a spreadsheet and write OCR rows using a Google OAuth / service-account token.
 * Safe to call from browser (user token) or server (service account token).
 */
export async function exportRowsWithAccessToken(
  options: SheetsExportOptions
): Promise<SheetsExportResult> {
  const { accessToken, rows, title, folderId } = options;
  const headers = authHeaders(accessToken);

  let spreadsheetId: string;

  if (folderId) {
    // Create the file directly in the target folder (Drive API)
    const createFileRes = await fetch(
      "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: title,
          mimeType: "application/vnd.google-apps.spreadsheet",
          parents: [folderId],
        }),
      }
    );
    const createdFile = await createFileRes.json();
    if (!createFileRes.ok) {
      throw new Error(createdFile.error?.message || "スプレッドシートの作成に失敗しました");
    }
    spreadsheetId = createdFile.id as string;

    // Rename default sheet tab
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        requests: [
          {
            updateSheetProperties: {
              properties: { sheetId: 0, title: "現調データ" },
              fields: "title",
            },
          },
        ],
      }),
    });
  } else {
    const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers,
      body: JSON.stringify({
        properties: { title },
        sheets: [{ properties: { title: "現調データ" } }],
      }),
    });
    const created = await createRes.json();
    if (!createRes.ok) {
      throw new Error(created.error?.message || "スプレッドシートの作成に失敗しました");
    }
    spreadsheetId = created.spreadsheetId as string;
  }

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({ values: buildSheetValues(rows) }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json();
    throw new Error(err.error?.message || "データの書き込みに失敗しました");
  }

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    rowCount: rows.length,
  };
}
