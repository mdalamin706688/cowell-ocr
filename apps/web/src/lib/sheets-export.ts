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
   * Optional known id for JBC-COWELL. Verified by name before use.
   * If missing/invalid, app finds or creates JBC-COWELL under My Drive.
   */
  folderId?: string | null;
}

const PHOTO_COLUMN_INDEX = SURVEY_COLUMNS.indexOf("写真");
const SHEET_TAB_TITLE = "現調データ";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const DRIVE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const PARENT_FOLDER_CACHE_KEY = "cowell_drive_jbc_folder_id";

/** Prevent parallel exports from creating duplicate survey folders */
let exportMutex: Promise<unknown> = Promise.resolve();

/** Serialize JBC-COWELL lookup/creation across tabs in the same session */
let parentFolderMutex: Promise<unknown> = Promise.resolve();

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

function clearCachedParentFolderId(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(PARENT_FOLDER_CACHE_KEY);
  } catch {
    // ignore
  }
}

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

async function getJbcCowellFolderIfValid(
  accessToken: string,
  folderId: string
): Promise<string | null> {
  const meta = await getFolderMeta(accessToken, folderId);
  if (!meta) return null;
  if (meta.name !== DRIVE_PARENT_FOLDER_NAME) return null;
  return meta.id;
}

/** Find an existing app-visible JBC-COWELL folder at My Drive root (drive.file scope). */
async function findExistingJbcCowellFolder(accessToken: string): Promise<string | null> {
  const q = [
    `name = '${DRIVE_PARENT_FOLDER_NAME}'`,
    `mimeType = '${DRIVE_FOLDER_MIME}'`,
    "'root' in parents",
    "trashed = false",
  ].join(" and ");

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&pageSize=10&fields=files(id,name,parents)&q=${encodeURIComponent(q)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const files = (data.files || []) as Array<{ id: string; name: string }>;
  const match = files.find((f) => f.name === DRIVE_PARENT_FOLDER_NAME);
  return match?.id ?? null;
}

async function getFileParents(
  accessToken: string,
  fileId: string
): Promise<string[] | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=parents`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data.parents) ? (data.parents as string[]) : [];
}

/** True if Drive lists this file as a child of parentId (works when GET parents is empty). */
async function fileAppearsInFolder(
  accessToken: string,
  fileId: string,
  parentId: string
): Promise<boolean> {
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      pageSize: "100",
      fields: "nextPageToken,files(id)",
      q: `'${parentId}' in parents and trashed = false`,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    const files = (data.files || []) as Array<{ id: string }>;
    if (files.some((f) => f.id === fileId)) return true;
    pageToken = data.nextPageToken as string | undefined;
    if (!pageToken) break;
  }
  return false;
}

async function patchParents(
  accessToken: string,
  fileId: string,
  addParents: string | null,
  removeParents: string | null
): Promise<boolean> {
  const params = new URLSearchParams({ supportsAllDrives: "true" });
  if (addParents) params.set("addParents", addParents);
  if (removeParents) params.set("removeParents", removeParents);
  if (!addParents && !removeParents) return true;

  const patchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`,
    {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify({}),
    }
  );
  return patchRes.ok;
}

/**
 * Force a file to have EXACTLY one parent (non-root only).
 * Strips My Drive root so survey folders don't also appear outside JBC-COWELL.
 * (drive.file often returns empty parents right after create — we still move + verify.)
 */
async function ensureExclusiveParent(
  accessToken: string,
  fileId: string,
  expectedParentId: string
): Promise<void> {
  if (!expectedParentId || expectedParentId === "root") {
    return;
  }

  const parents = (await getFileParents(accessToken, fileId)) ?? [];
  if (parents.length === 1 && parents[0] === expectedParentId) {
    return;
  }

  const extra = parents.filter((p) => p !== expectedParentId);
  // Always add expected parent. Remove known extras; also strip alias "root"
  // so multi-parent "inside JBC + My Drive root" cannot linger.
  const removeSet = new Set<string>(extra);
  if (!parents.includes(expectedParentId) || parents.length !== 1) {
    removeSet.add("root");
  }
  const removeParents = [...removeSet].join(",") || null;

  let ok = await patchParents(accessToken, fileId, expectedParentId, removeParents);
  if (!ok && removeParents?.includes("root")) {
    // Retry without root alias if Drive rejects it
    const onlyExtras = extra.join(",") || null;
    ok = await patchParents(accessToken, fileId, expectedParentId, onlyExtras);
  }
  if (!ok) {
    throw new Error("フォルダを JBC-COWELL へ移動できませんでした");
  }

  const after = (await getFileParents(accessToken, fileId)) ?? [];
  if (after.length === 1 && after[0] === expectedParentId) {
    return;
  }

  // GET parents empty/unreliable under drive.file — confirm via folder listing
  const listed = await fileAppearsInFolder(accessToken, fileId, expectedParentId);
  if (listed) {
    // Best-effort: strip root again so UI doesn't show a My Drive duplicate
    await patchParents(accessToken, fileId, expectedParentId, "root");
    return;
  }

  throw new Error(
    "調査フォルダが My Drive 直下にも残っています。再エクスポートしてください。"
  );
}

async function createDriveFile(
  accessToken: string,
  name: string,
  mimeType: string,
  parentFolderId: string
): Promise<string> {
  if (!parentFolderId) {
    throw new Error("親フォルダが指定されていません");
  }

  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,parents",
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        name: sanitizeDriveName(name),
        mimeType,
        parents: [parentFolderId],
      }),
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

  const fileId = created.id as string;
  if (parentFolderId !== "root") {
    await ensureExclusiveParent(accessToken, fileId, parentFolderId);
  }
  return fileId;
}

async function ensureParentFolderUnlocked(
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

  // Stale env/cache ids (e.g. user deleted JBC-COWELL) — drop local cache
  clearCachedParentFolderId();

  const found = await findExistingJbcCowellFolder(accessToken);
  if (found) {
    writeCachedParentFolderId(found);
    return found;
  }

  // Create under My Drive root. Trust the create response — with drive.file,
  // GET parents on a brand-new root folder is often empty and used to fail the
  // first export even though JBC-COWELL was created (second try then worked).
  const createdId = await createDriveFile(
    accessToken,
    DRIVE_PARENT_FOLDER_NAME,
    DRIVE_FOLDER_MIME,
    "root"
  );
  if (!createdId) {
    throw new Error("JBC-COWELL フォルダの作成に失敗しました。再エクスポートしてください。");
  }

  writeCachedParentFolderId(createdId);
  return createdId;
}

async function ensureParentFolder(
  accessToken: string,
  configuredFolderId?: string | null
): Promise<string> {
  const run = parentFolderMutex.then(
    () => ensureParentFolderUnlocked(accessToken, configuredFolderId),
    () => ensureParentFolderUnlocked(accessToken, configuredFolderId)
  );
  parentFolderMutex = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function createProcessFolder(
  accessToken: string,
  processName: string,
  parentFolderId: string
): Promise<string> {
  if (!parentFolderId || parentFolderId === "root") {
    throw new Error("親フォルダ JBC-COWELL を作成できませんでした");
  }
  // Re-validate JBC still exists (stale cache after user delete)
  const jbc = await getJbcCowellFolderIfValid(accessToken, parentFolderId);
  if (!jbc) {
    throw new Error("親フォルダ JBC-COWELL を作成できませんでした");
  }

  const folderId = await createDriveFile(
    accessToken,
    processName,
    DRIVE_FOLDER_MIME,
    jbc
  );
  // Photo uploads touch many Drive files; re-assert nesting before continuing
  await ensureExclusiveParent(accessToken, folderId, jbc);
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

/**
 * Two-step upload: metadata+parents first, then media.
 * Multipart often dropped parents so photos (and Drive UI) drifted to My Drive root.
 */
async function uploadPhotoToDrive(
  accessToken: string,
  base64: string,
  mimeType: string,
  fileName: string,
  processFolderId: string
): Promise<string> {
  const createRes = await fetch(
    "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,parents",
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        name: fileName,
        mimeType,
        parents: [processFolderId],
      }),
    }
  );
  const created = await createRes.json();
  if (!createRes.ok) {
    throw new Error(created.error?.message || "写真のアップロードに失敗しました");
  }

  const fileId = created.id as string;
  await ensureExclusiveParent(accessToken, fileId, processFolderId);

  const fileBytes = base64ToBytes(base64);
  const mediaBody = fileBytes.buffer.slice(
    fileBytes.byteOffset,
    fileBytes.byteOffset + fileBytes.byteLength
  ) as ArrayBuffer;

  const uploadRes = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&supportsAllDrives=true`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": mimeType,
      },
      body: mediaBody,
    }
  );
  if (!uploadRes.ok) {
    const uploaded = await uploadRes.json().catch(() => ({}));
    throw new Error(
      (uploaded as { error?: { message?: string } }).error?.message ||
        "写真のアップロードに失敗しました"
    );
  }

  // Media PATCH can reset parents in some cases — lock nesting again
  await ensureExclusiveParent(accessToken, fileId, processFolderId);

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

async function exportRowsWithAccessTokenUnlocked(
  options: SheetsExportOptions
): Promise<SheetsExportResult> {
  const { accessToken, rows, title, folderId } = options;
  const headers = authHeaders(accessToken);
  const processName = sanitizeDriveName(title);

  let parentFolderId = await ensureParentFolder(accessToken, folderId);
  if (!(await getJbcCowellFolderIfValid(accessToken, parentFolderId))) {
    clearCachedParentFolderId();
    parentFolderId = await ensureParentFolder(accessToken, folderId);
  }
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
    // Photo media uploads can disturb nesting — pin survey folder under JBC again
    await ensureExclusiveParent(accessToken, processFolderId, parentFolderId);
  }

  await touchSpreadsheetFile(accessToken, spreadsheetId);

  // Final guarantee: survey folder only under JBC-COWELL (not also My Drive root)
  await ensureExclusiveParent(accessToken, processFolderId, parentFolderId);

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

/**
 * Export one survey under JBC-COWELL only (never also under My Drive root).
 */
export async function exportRowsWithAccessToken(
  options: SheetsExportOptions
): Promise<SheetsExportResult> {
  const run = exportMutex.then(
    () => exportRowsWithAccessTokenUnlocked(options),
    () => exportRowsWithAccessTokenUnlocked(options)
  );
  exportMutex = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}
