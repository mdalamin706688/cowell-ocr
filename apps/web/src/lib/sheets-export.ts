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

const PHOTO_COLUMN_INDEX = SURVEY_COLUMNS.indexOf("写真");
const SHEET_TITLE = "現調データ";

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function buildSheetValues(rows: OcrRow[]): string[][] {
  return [
    [...SURVEY_COLUMNS],
    ...rows.map((r) => [
      r.floor,
      r.location,
      r.fixtureModel,
      r.existingProduct,
      r.photoBase64 ? "" : "",
      r.quantity,
      r.notes,
    ]),
  ];
}

function driveImageUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

async function uploadPhotoToDrive(
  accessToken: string,
  base64: string,
  mimeType: string,
  fileName: string,
  folderId?: string | null
): Promise<string> {
  const metadata: Record<string, unknown> = {
    name: fileName,
    mimeType,
  };
  if (folderId) metadata.parents = [folderId];

  const boundary = `cowell_${Date.now()}`;
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    `${base64}\r\n` +
    `--${boundary}--`;

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  const uploaded = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(uploaded.error?.message || "写真のアップロードに失敗しました");
  }

  const fileId = uploaded.id as string;

  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  return driveImageUrl(fileId);
}

function columnLetter(index: number): string {
  return String.fromCharCode("A".charCodeAt(0) + index);
}

async function attachRowPhotos(
  accessToken: string,
  spreadsheetId: string,
  rows: OcrRow[],
  folderId?: string | null
): Promise<void> {
  const photoRows = rows
    .map((row, index) => ({ row, sheetRow: index + 2 }))
    .filter((item) => item.row.photoBase64 && item.row.photoMimeType);

  if (!photoRows.length) return;

  const updates: Array<{ range: string; values: string[][] }> = [];

  for (const { row, sheetRow } of photoRows) {
    const imageUrl = await uploadPhotoToDrive(
      accessToken,
      row.photoBase64!,
      row.photoMimeType!,
      `gencho_row_${sheetRow}.jpg`,
      folderId
    );
    const cell = `${columnLetter(PHOTO_COLUMN_INDEX)}${sheetRow}`;
    updates.push({
      range: `${SHEET_TITLE}!${cell}`,
      values: [[`=IMAGE("${imageUrl}")`]],
    });
  }

  const batchRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: updates,
      }),
    }
  );

  if (!batchRes.ok) {
    const err = await batchRes.json();
    throw new Error(err.error?.message || "写真のシート反映に失敗しました");
  }

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      requests: [
        {
          updateDimensionProperties: {
            range: {
              sheetId: 0,
              dimension: "COLUMNS",
              startIndex: PHOTO_COLUMN_INDEX,
              endIndex: PHOTO_COLUMN_INDEX + 1,
            },
            properties: { pixelSize: 140 },
            fields: "pixelSize",
          },
        },
        ...photoRows.map(({ sheetRow }) => ({
          updateDimensionProperties: {
            range: {
              sheetId: 0,
              dimension: "ROWS",
              startIndex: sheetRow - 1,
              endIndex: sheetRow,
            },
            properties: { pixelSize: 96 },
            fields: "pixelSize",
          },
        })),
      ],
    }),
  });
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

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        requests: [
          {
            updateSheetProperties: {
              properties: { sheetId: 0, title: SHEET_TITLE },
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
        sheets: [{ properties: { title: SHEET_TITLE } }],
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

  await attachRowPhotos(accessToken, spreadsheetId, rows, folderId);

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    rowCount: rows.length,
  };
}
