import { SURVEY_COLUMNS, type OcrRow } from "@cowell/shared";

export const GOOGLE_SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

export interface SheetsExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  rowCount: number;
  photoCount: number;
  /** Drive folder that holds this process's row photos (like "project A") */
  processFolderId?: string;
  processFolderUrl?: string;
}

export interface SheetsExportOptions {
  accessToken: string;
  rows: OcrRow[];
  /** Process name — becomes the Drive folder name (like "project A") */
  title: string;
  /**
   * Optional parent Drive folder (= "space for this project" in client example).
   *
   * Layout (matches client screenshot):
   *   [parent space]
   *     ├── {title}/              ← process folder (photos only)
   *     └── 結果シート - {title}   ← spreadsheet (sibling, like "result sheet")
   */
  folderId?: string | null;
}

const PHOTO_COLUMN_INDEX = SURVEY_COLUMNS.indexOf("写真");
const SHEET_TAB_TITLE = "現調データ";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const DRIVE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";

/** Spreadsheet Drive file name — mirrors client "result sheet" */
function resultSheetDriveName(processName: string): string {
  return `結果シート - ${sanitizeDriveName(processName)}`;
}

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
      "",
      r.quantity,
      r.notes,
    ]),
  ];
}

function driveImageUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

function driveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

function sanitizeDriveName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "現調";
}

function countPhotoRows(rows: OcrRow[]): number {
  return rows.filter((r) => r.photoBase64 && r.photoMimeType).length;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function createDriveFile(
  accessToken: string,
  name: string,
  mimeType: string,
  parentFolderId?: string | null
): Promise<string> {
  const metadata: Record<string, unknown> = {
    name: sanitizeDriveName(name),
    mimeType,
  };
  if (parentFolderId) metadata.parents = [parentFolderId];

  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id",
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(metadata),
    }
  );
  const created = await res.json();
  if (!res.ok) {
    throw new Error(
      created.error?.message ||
        (mimeType === DRIVE_FOLDER_MIME
          ? "プロセス用フォルダの作成に失敗しました"
          : "スプレッドシートの作成に失敗しました")
    );
  }
  return created.id as string;
}

/** Process folder = "project A" / "project B" — stores that run's images only */
async function createProcessFolder(
  accessToken: string,
  processName: string,
  parentFolderId?: string | null
): Promise<string> {
  return createDriveFile(accessToken, processName, DRIVE_FOLDER_MIME, parentFolderId);
}

/** Spreadsheet = "result sheet" — sibling of the process folder */
async function createResultSpreadsheet(
  accessToken: string,
  processName: string,
  parentFolderId?: string | null
): Promise<string> {
  const headers = authHeaders(accessToken);
  const spreadsheetId = await createDriveFile(
    accessToken,
    resultSheetDriveName(processName),
    DRIVE_SHEET_MIME,
    parentFolderId
  );

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId: 0, title: SHEET_TAB_TITLE },
            fields: "title",
          },
        },
      ],
    }),
  });

  return spreadsheetId;
}

async function uploadPhotoToDrive(
  accessToken: string,
  base64: string,
  mimeType: string,
  fileName: string,
  processFolderId: string
): Promise<string> {
  const metadata: Record<string, unknown> = {
    name: fileName,
    mimeType,
    parents: [processFolderId],
  };

  const boundary = `cowell_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const metaPart =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n`;
  const filePart = `--${boundary}\r\n` + `Content-Type: ${mimeType}\r\n\r\n`;
  const closePart = `\r\n--${boundary}--`;
  const fileBytes = base64ToBytes(base64);
  const fileBlob = new Blob([
    fileBytes.buffer.slice(
      fileBytes.byteOffset,
      fileBytes.byteOffset + fileBytes.byteLength
    ) as ArrayBuffer,
  ]);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: new Blob([metaPart, filePart, fileBlob, closePart]),
    }
  );
  const uploaded = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(uploaded.error?.message || "写真のアップロードに失敗しました");
  }

  const fileId = uploaded.id as string;

  const permRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    }
  );
  if (!permRes.ok) {
    const permErr = await permRes.json().catch(() => ({}));
    throw new Error(
      (permErr as { error?: { message?: string } }).error?.message ||
        "写真の共有設定に失敗しました。GoogleアカウントのDrive権限を確認してください。"
    );
  }

  return driveImageUrl(fileId);
}

function columnLetter(index: number): string {
  return String.fromCharCode("A".charCodeAt(0) + index);
}

async function attachRowPhotos(
  accessToken: string,
  spreadsheetId: string,
  rows: OcrRow[],
  processFolderId: string
): Promise<number> {
  const photoRows = rows
    .map((row, index) => ({ row, sheetRow: index + 2 }))
    .filter((item) => item.row.photoBase64 && item.row.photoMimeType);

  if (!photoRows.length) return 0;

  const updates: Array<{ range: string; values: string[][] }> = [];

  for (const { row, sheetRow } of photoRows) {
    const imageUrl = await uploadPhotoToDrive(
      accessToken,
      row.photoBase64!,
      row.photoMimeType!,
      `row_${String(sheetRow - 1).padStart(3, "0")}.jpg`,
      processFolderId
    );
    const cell = `${columnLetter(PHOTO_COLUMN_INDEX)}${sheetRow}`;
    updates.push({
      range: `${SHEET_TAB_TITLE}!${cell}`,
      // mode 1 = fit to cell (mode 4 requires height+width and caused #N/A)
      values: [[`=IMAGE("${imageUrl}", 1)`]],
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

  return photoRows.length;
}

/**
 * Export one survey process to Drive + Sheets.
 *
 * Matches client example:
 *   space for this project/
 *     ├── project A/          ← process folder (images)
 *     ├── project B/
 *     └── result sheet        ← spreadsheet sibling
 */
export async function exportRowsWithAccessToken(
  options: SheetsExportOptions
): Promise<SheetsExportResult> {
  const { accessToken, rows, title, folderId } = options;
  const headers = authHeaders(accessToken);
  const processName = sanitizeDriveName(title);

  // Always create process folder first (like "project A")
  const processFolderId = await createProcessFolder(accessToken, processName, folderId);

  // Spreadsheet as sibling (like "result sheet")
  const spreadsheetId = await createResultSpreadsheet(accessToken, processName, folderId);

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

  let photoCount = 0;
  if (countPhotoRows(rows) > 0) {
    photoCount = await attachRowPhotos(accessToken, spreadsheetId, rows, processFolderId);
  }

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    rowCount: rows.length,
    photoCount,
    processFolderId,
    processFolderUrl: driveFolderUrl(processFolderId),
  };
}
