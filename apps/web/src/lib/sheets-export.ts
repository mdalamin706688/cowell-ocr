import { SURVEY_COLUMNS, type OcrRow } from "@cowell/shared";

export const GOOGLE_SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

/** Root Drive folder where every survey process is stored */
export const DRIVE_PARENT_FOLDER_NAME = "JBC-COWELL";

export interface SheetsExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  rowCount: number;
  photoCount: number;
  processFolderId?: string;
  processFolderUrl?: string;
  parentFolderId?: string;
  parentFolderUrl?: string;
}

export interface SheetsExportOptions {
  accessToken: string;
  rows: OcrRow[];
  /** Process / survey name → folder under JBC-COWELL */
  title: string;
  /**
   * Optional known id for JBC-COWELL. Verified before use.
   * If missing/invalid, app creates JBC-COWELL under My Drive and caches the id.
   */
  folderId?: string | null;
}

const PHOTO_COLUMN_INDEX = SURVEY_COLUMNS.indexOf("写真");
const SHEET_TAB_TITLE = "現調データ";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const DRIVE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const PARENT_FOLDER_CACHE_KEY = "cowell_drive_jbc_folder_id";

/** Name sorts before 1_row_*.jpg; also touched last so it tops "Date modified" */
function resultSheetDriveName(): string {
  return "0_結果シート";
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

function readCachedParentFolderId(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(PARENT_FOLDER_CACHE_KEY);
  } catch {
    return null;
  }
}

function writeCachedParentFolderId(id: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PARENT_FOLDER_CACHE_KEY, id);
  } catch {
    // private mode / quota
  }
}

/** Return folder meta if it exists and is a folder; otherwise null */
async function getFolderMeta(
  accessToken: string,
  folderId: string
): Promise<{ id: string; name: string } | null> {
  if (!folderId || folderId === "root") return null;

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?supportsAllDrives=true&fields=id,name,mimeType,trashed`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.trashed) return null;
  if (data.mimeType !== DRIVE_FOLDER_MIME) return null;
  return { id: data.id as string, name: String(data.name || "") };
}

/** Only JBC-COWELL is a valid parent — never My Drive root */
async function getJbcCowellFolderIfValid(
  accessToken: string,
  folderId: string
): Promise<string | null> {
  const meta = await getFolderMeta(accessToken, folderId);
  if (!meta) return null;
  if (meta.name !== DRIVE_PARENT_FOLDER_NAME) return null;
  return meta.id;
}

/**
 * Always require an explicit parent id ("root" for My Drive top level).
 * This prevents survey folders from landing loose in My Drive.
 */
async function createDriveFile(
  accessToken: string,
  name: string,
  mimeType: string,
  parentFolderId: string
): Promise<string> {
  if (!parentFolderId) {
    throw new Error("親フォルダが指定されていません");
  }

  const metadata = {
    name: sanitizeDriveName(name),
    mimeType,
    parents: [parentFolderId],
  };

  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,parents",
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
          ? "フォルダの作成に失敗しました"
          : "スプレッドシートの作成に失敗しました")
    );
  }
  return created.id as string;
}

/** If a file ended up under My Drive root, move it into JBC-COWELL */
async function ensureFileParent(
  accessToken: string,
  fileId: string,
  expectedParentId: string
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=parents`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return;
  const data = await res.json();
  const parents: string[] = data.parents || [];
  if (parents.includes(expectedParentId)) return;

  const previous = parents.length ? parents.join(",") : "root";
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&addParents=${encodeURIComponent(expectedParentId)}&removeParents=${encodeURIComponent(previous)}`,
    {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify({}),
    }
  );
}

/**
 * Resolve parent folder JBC-COWELL under My Drive.
 * Rejects My Drive root / wrong-named folders (common cause of duplicate surveys at root).
 */
async function ensureParentFolder(
  accessToken: string,
  configuredFolderId?: string | null
): Promise<string> {
  const candidates = [configuredFolderId?.trim(), readCachedParentFolderId()].filter(
    Boolean
  ) as string[];

  for (const id of candidates) {
    const valid = await getJbcCowellFolderIfValid(accessToken, id);
    if (valid) {
      writeCachedParentFolderId(valid);
      return valid;
    }
  }

  // Stale cache pointed at My Drive / wrong folder — clear it
  try {
    localStorage.removeItem(PARENT_FOLDER_CACHE_KEY);
  } catch {
    // ignore
  }

  // Create JBC-COWELL under My Drive root
  const createdId = await createDriveFile(
    accessToken,
    DRIVE_PARENT_FOLDER_NAME,
    DRIVE_FOLDER_MIME,
    "root"
  );
  writeCachedParentFolderId(createdId);
  return createdId;
}

async function createProcessFolder(
  accessToken: string,
  processName: string,
  parentFolderId: string
): Promise<string> {
  if (!parentFolderId || parentFolderId === "root") {
    throw new Error("親フォルダ JBC-COWELL を作成できませんでした");
  }
  const folderId = await createDriveFile(
    accessToken,
    processName,
    DRIVE_FOLDER_MIME,
    parentFolderId
  );
  // Guard against Drive placing the folder at root
  await ensureFileParent(accessToken, folderId, parentFolderId);
  return folderId;
}

async function createResultSpreadsheet(
  accessToken: string,
  processFolderId: string
): Promise<string> {
  const headers = authHeaders(accessToken);
  const spreadsheetId = await createDriveFile(
    accessToken,
    resultSheetDriveName(),
    DRIVE_SHEET_MIME,
    processFolderId
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
  const metadata = {
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
      `1_row_${String(sheetRow - 1).padStart(3, "0")}.jpg`,
      processFolderId
    );
    const cell = `${columnLetter(PHOTO_COLUMN_INDEX)}${sheetRow}`;
    updates.push({
      range: `${SHEET_TAB_TITLE}!${cell}`,
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

/** Bump spreadsheet modified time so it appears above photos (Drive default: newest first) */
async function touchSpreadsheetFile(
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(spreadsheetId)}?supportsAllDrives=true`,
    {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        description: `Cowell OCR · ${new Date().toISOString()}`,
      }),
    }
  );
}

/**
 * Export one survey under JBC-COWELL:
 *   My Drive / JBC-COWELL / {process} / 0_結果シート + 1_row_*.jpg
 */
export async function exportRowsWithAccessToken(
  options: SheetsExportOptions
): Promise<SheetsExportResult> {
  const { accessToken, rows, title, folderId } = options;
  const headers = authHeaders(accessToken);
  const processName = sanitizeDriveName(title);

  const parentFolderId = await ensureParentFolder(accessToken, folderId);
  if (!parentFolderId) {
    throw new Error("親フォルダ JBC-COWELL を作成できませんでした");
  }

  const processFolderId = await createProcessFolder(accessToken, processName, parentFolderId);

  const spreadsheetId = await createResultSpreadsheet(accessToken, processFolderId);

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

  // Sheet last in modified-time → shows first when Drive sorts by date (newest first)
  await touchSpreadsheetFile(accessToken, spreadsheetId);

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    rowCount: rows.length,
    photoCount,
    processFolderId,
    processFolderUrl: driveFolderUrl(processFolderId),
    parentFolderId,
    parentFolderUrl: driveFolderUrl(parentFolderId),
  };
}
