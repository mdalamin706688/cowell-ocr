import {
  EXPORT_SHEET_COLUMNS,
  EXPORT_SHEET_DATA_START_ROW,
  type OcrRow,
} from "@cowell/shared";
import {
  DEFAULT_DRIVE_ROOT_FOLDER_NAME,
  sanitizeRootFolderName,
  writeLastRootFolder,
} from "./drive-root-folder";
import {
  buildRowPhotoFileName,
  buildSpreadsheetDriveName,
  sanitizeProjectFolderName,
} from "./survey-process-name";

export const GOOGLE_SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

/** Default root Drive folder name when user has not chosen one */
export const DRIVE_PARENT_FOLDER_NAME = DEFAULT_DRIVE_ROOT_FOLDER_NAME;

export interface SheetsExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  rowCount: number;
  photoCount: number;
  processFolderId?: string;
  processFolderUrl?: string;
  parentFolderId?: string;
  parentFolderUrl?: string;
  parentFolderName?: string;
}

export interface SurveyDriveStaging {
  processFolderId: string;
  processFolderUrl: string;
  sourceFolderId: string;
  sourceCount: number;
}

export interface StageSurveySourceOptions {
  accessToken: string;
  projectName?: string;
  /** @deprecated Use projectName */
  title?: string;
  rootFolderName?: string;
  folderId?: string | null;
  sourceFiles?: DriveSourceFile[];
  onProgress?: (done: number, total: number) => void;
}

export interface DriveSourceFile {
  base64: string;
  mimeType: string;
  name: string;
}

export interface DriveRootFolderOption {
  id: string;
  name: string;
}

/** Phases for Google Drive / Sheets export progress UI */
export type ExportProgressPhase =
  | "connecting"
  | "folders"
  | "spreadsheet"
  | "photos"
  | "sources"
  | "finishing";

export interface ExportProgressEvent {
  /** 0–100 */
  percent: number;
  phase: ExportProgressPhase;
  /** Optional detail e.g. "3 / 12" */
  detail?: string;
}

export type ExportProgressCallback = (event: ExportProgressEvent) => void;

export interface SheetsExportOptions {
  accessToken: string;
  rows: OcrRow[];
  /** Project name → survey folder under the chosen root */
  projectName?: string;
  /** @deprecated Use projectName */
  title?: string;
  /** Root folder name under My Drive (default JBC-COWELL) */
  rootFolderName?: string;
  /** Original files uploaded by the user (saved under 元ファイル/) */
  sourceFiles?: DriveSourceFile[];
  /** Reuse a survey folder created before OCR (元ファイル already uploaded). */
  existingProcessFolderId?: string;
  /** Skip uploading source files when they were staged before OCR. */
  skipSourceUpload?: boolean;
  /**
   * Optional known id for the root folder. Verified before use.
   * If missing/invalid, app finds or creates the named root under My Drive.
   */
  folderId?: string | null;
  /** Progress updates for UI (client-side export) */
  onProgress?: ExportProgressCallback;
}

const SHEET_TAB_TITLE = "現調データ";
const PHOTO_COLUMN_INDEX = EXPORT_SHEET_COLUMNS.indexOf("写真");
const PHOTO_FOLDER_NAME = "画像";
const SOURCE_FOLDER_NAME = "元ファイル";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const DRIVE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const PARENT_FOLDER_CACHE_KEY = "cowell_drive_jbc_folder_id";

/** Prevent parallel exports from creating duplicate survey folders */
let exportMutex: Promise<unknown> = Promise.resolve();

/** Serialize root-folder lookup/creation across tabs in the same session */
let parentFolderMutex: Promise<unknown> = Promise.resolve();

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function formatExportCell(value: string | undefined): string {
  return (value ?? "").trim();
}

/** Quantity from OCR — drop spurious decimals like 36.0 → 36 */
function formatExportQuantity(value: string | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isNaN(n) && Number.isFinite(n) && Math.abs(n - Math.round(n)) < 1e-9) {
    return String(Math.round(n));
  }
  return raw;
}

/** Map one OCR row to export cells (OCR JSON fields only; pricing columns blank). */
function mapOcrRowToExportValues(row: OcrRow): string[] {
  return [
    formatExportCell(row.floor),
    formatExportCell(row.location),
    formatExportCell(row.fixtureModel),
    formatExportCell(row.existingProduct),
    "", // 写真 — IMAGE() applied after upload
    formatExportQuantity(row.quantity),
    formatExportCell(row.notes),
    "",
    "",
    "",
    "",
    "",
  ];
}

function buildSheetValues(rows: OcrRow[], sheetTitle: string): string[][] {
  // Title row = project/site name (like sample-output.xlsx), never root folder (JBC-COWELL).
  const title = sheetTitle.trim();
  if (!title) {
    throw new Error("スプレッドシートのタイトル（案件名）が未設定です");
  }
  return [[title], [...EXPORT_SHEET_COLUMNS], ...rows.map(mapOcrRowToExportValues)];
}

function columnLetter(index: number): string {
  let n = index;
  let label = "";
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
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

function sanitizeDriveFileName(name: string): string {
  const base = name.replace(/[\\/:*?"<>|]/g, "_").trim() || "upload";
  return base.slice(0, 200);
}

function resolveProjectName(options: {
  projectName?: string;
  title?: string;
}): string {
  return sanitizeProjectFolderName(options.projectName ?? options.title);
}

function resolveRootFolderName(options: { rootFolderName?: string }): string {
  return sanitizeRootFolderName(options.rootFolderName || DRIVE_PARENT_FOLDER_NAME);
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function emitProgress(
  onProgress: ExportProgressCallback | undefined,
  percent: number,
  phase: ExportProgressPhase,
  detail?: string
): void {
  if (!onProgress) return;
  onProgress({
    percent: Math.round(Math.min(100, Math.max(0, percent))),
    phase,
    detail,
  });
}

/** Map a 0–1 fraction into a percent range (inclusive start, exclusive-ish end). */
function rangePercent(start: number, end: number, fraction: number): number {
  const t = Math.min(1, Math.max(0, fraction));
  return start + (end - start) * t;
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

async function getParentFolderIfValid(
  accessToken: string,
  folderId: string,
  expectedName?: string
): Promise<{ id: string; name: string } | null> {
  const meta = await getFolderMeta(accessToken, folderId);
  if (!meta) return null;
  if (expectedName && meta.name !== expectedName) return null;
  return meta;
}

/** Public check for UI — returns null when deleted, trashed, or not a folder. */
export async function verifyDriveFolder(
  accessToken: string,
  folderId: string
): Promise<{ id: string; name: string } | null> {
  if (!folderId?.trim()) return null;
  return getFolderMeta(accessToken, folderId.trim());
}

/** List app-visible folders at My Drive root (drive.file scope). */
export async function listDriveRootFolders(
  accessToken: string
): Promise<DriveRootFolderOption[]> {
  const q = [
    `mimeType = '${DRIVE_FOLDER_MIME}'`,
    "'root' in parents",
    "trashed = false",
  ].join(" and ");

  const folders: DriveRootFolderOption[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({
      supportsAllDrives: "true",
      pageSize: "50",
      fields: "nextPageToken,files(id,name)",
      q,
      orderBy: "name",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) break;
    const data = await res.json();
    const files = (data.files || []) as Array<{ id: string; name: string }>;
    for (const f of files) {
      if (!f.id || !f.name?.trim()) continue;
      folders.push({ id: f.id, name: String(f.name).trim() });
    }
    pageToken = data.nextPageToken as string | undefined;
    if (!pageToken) break;
  }

  const seen = new Set<string>();
  return folders.filter((f) => {
    const key = f.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** List child folders under a parent (for project-name uniqueness checks). */
export async function listDriveChildFolders(
  accessToken: string,
  parentFolderId: string
): Promise<DriveRootFolderOption[]> {
  if (!parentFolderId || parentFolderId === "root") return [];

  const q = [
    `mimeType = '${DRIVE_FOLDER_MIME}'`,
    `'${parentFolderId}' in parents`,
    "trashed = false",
  ].join(" and ");

  const folders: DriveRootFolderOption[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({
      supportsAllDrives: "true",
      pageSize: "100",
      fields: "nextPageToken,files(id,name)",
      q,
      orderBy: "name",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) break;
    const data = await res.json();
    const files = (data.files || []) as Array<{ id: string; name: string }>;
    for (const f of files) {
      if (!f.id || !f.name?.trim()) continue;
      folders.push({ id: f.id, name: String(f.name).trim() });
    }
    pageToken = data.nextPageToken as string | undefined;
    if (!pageToken) break;
  }

  const seen = new Set<string>();
  return folders.filter((f) => {
    const key = f.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Find an existing app-visible root folder by name under My Drive. */
async function findExistingRootFolder(
  accessToken: string,
  folderName: string
): Promise<{ id: string; name: string } | null> {
  const name = sanitizeRootFolderName(folderName);
  const q = [
    `name = '${escapeDriveQueryValue(name)}'`,
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
  const match = files.find((f) => f.name === name);
  return match ? { id: match.id, name: match.name } : null;
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
 * Strips My Drive root so survey folders don't also appear outside the chosen root.
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
  // so multi-parent "inside root + My Drive root" cannot linger.
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
    throw new Error("フォルダをルートフォルダへ移動できませんでした");
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
  rootFolderName: string,
  configuredFolderId?: string | null
): Promise<{ id: string; name: string }> {
  const name = sanitizeRootFolderName(rootFolderName);
  const candidates = [configuredFolderId?.trim(), readCachedParentFolderId()].filter(
    Boolean
  ) as string[];

  for (const id of candidates) {
    const valid = await getParentFolderIfValid(accessToken, id, name);
    if (valid) {
      writeCachedParentFolderId(valid.id);
      writeLastRootFolder({ id: valid.id, name: valid.name });
      return valid;
    }
  }

  // Stale env/cache ids (e.g. user deleted the root) — drop local cache
  clearCachedParentFolderId();

  const found = await findExistingRootFolder(accessToken, name);
  if (found) {
    writeCachedParentFolderId(found.id);
    writeLastRootFolder({ id: found.id, name: found.name });
    return found;
  }

  // Create under My Drive root. Trust the create response — with drive.file,
  // GET parents on a brand-new root folder is often empty and used to fail the
  // first export even though the folder was created (second try then worked).
  const createdId = await createDriveFile(
    accessToken,
    name,
    DRIVE_FOLDER_MIME,
    "root"
  );
  if (!createdId) {
    throw new Error("ルートフォルダの作成に失敗しました。再エクスポートしてください。");
  }

  writeCachedParentFolderId(createdId);
  writeLastRootFolder({ id: createdId, name });
  return { id: createdId, name };
}

async function ensureParentFolder(
  accessToken: string,
  rootFolderName: string,
  configuredFolderId?: string | null
): Promise<{ id: string; name: string }> {
  const run = parentFolderMutex.then(
    () => ensureParentFolderUnlocked(accessToken, rootFolderName, configuredFolderId),
    () => ensureParentFolderUnlocked(accessToken, rootFolderName, configuredFolderId)
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
  parentFolderId: string,
  parentFolderName: string
): Promise<string> {
  if (!parentFolderId || parentFolderId === "root") {
    throw new Error("ルートフォルダを作成できませんでした");
  }
  // Re-validate root still exists (stale cache after user delete)
  const parent = await getParentFolderIfValid(accessToken, parentFolderId, parentFolderName);
  if (!parent) {
    throw new Error("ルートフォルダを作成できませんでした");
  }

  const folderId = await createDriveFile(
    accessToken,
    processName,
    DRIVE_FOLDER_MIME,
    parent.id
  );
  // Photo uploads touch many Drive files; re-assert nesting before continuing
  await ensureExclusiveParent(accessToken, folderId, parent.id);
  return folderId;
}

async function findOrCreateChildFolder(
  accessToken: string,
  parentFolderId: string,
  folderName: string
): Promise<string> {
  const q = [
    `name = '${escapeDriveQueryValue(folderName)}'`,
    `'${parentFolderId}' in parents`,
    `mimeType = '${DRIVE_FOLDER_MIME}'`,
    "trashed = false",
  ].join(" and ");

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&pageSize=5&fields=files(id,name)&q=${encodeURIComponent(q)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (res.ok) {
    const data = await res.json();
    const files = (data.files || []) as Array<{ id: string; name: string }>;
    const match = files.find((f) => f.name === folderName);
    if (match?.id) return match.id;
  }

  const folderId = await createDriveFile(
    accessToken,
    folderName,
    DRIVE_FOLDER_MIME,
    parentFolderId
  );
  await ensureExclusiveParent(accessToken, folderId, parentFolderId);
  return folderId;
}

async function createPhotoSubfolder(
  accessToken: string,
  processFolderId: string
): Promise<string> {
  return findOrCreateChildFolder(accessToken, processFolderId, PHOTO_FOLDER_NAME);
}

async function createSourceSubfolder(
  accessToken: string,
  processFolderId: string
): Promise<string> {
  return findOrCreateChildFolder(accessToken, processFolderId, SOURCE_FOLDER_NAME);
}

async function createResultSpreadsheet(
  accessToken: string,
  processFolderId: string,
  spreadsheetName: string
): Promise<string> {
  const headers = authHeaders(accessToken);
  const spreadsheetId = await createDriveFile(
    accessToken,
    spreadsheetName,
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

/** Column pixel widths (OCR cols + sample pricing cols). */
const EXPORT_COLUMN_PIXEL_WIDTHS = [
  70, // フロア
  160, // 設置場所
  250, // 器具品番
  270, // 既設商品名
  140, // 写真
  64, // 数量
  350, // 備考
  260, // 選定商品
  190, // 定価
  100, // 仕切り単価
  140, // 合計
  480, // 備考（選定側）
] as const;

const NOTES_COLUMN_INDEXES = [6, 11] as const;
const PRODUCT_COLUMN_INDEX = 3;
const PHOTO_COL_INDEX = PHOTO_COLUMN_INDEX;
const QTY_COLUMN_INDEX = 5;

function textLineCount(text: string, charsPerLine: number): number {
  const raw = (text || "").trim();
  if (!raw) return 1;
  return raw.split(/\r?\n/).reduce((sum, line) => {
    const len = line.length || 1;
    return sum + Math.max(1, Math.ceil(len / charsPerLine));
  }, 0);
}

function estimateRowHeightPx(row: OcrRow, hasPhoto: boolean): number {
  const lines = Math.max(
    textLineCount(row.existingProduct, 32),
    textLineCount(row.notes, 28),
    textLineCount(row.location, 18),
    textLineCount(row.fixtureModel, 22)
  );
  const textHeight = 20 + lines * 16;
  if (hasPhoto) return Math.min(140, Math.max(96, textHeight));
  return Math.min(140, Math.max(28, textHeight));
}

/**
 * Apply sample-like spreadsheet formatting: title, headers, borders,
 * column widths, wrap text, and row heights for long cells.
 */
async function formatExportedSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  rows: OcrRow[]
): Promise<void> {
  const colCount = EXPORT_SHEET_COLUMNS.length;
  const dataStart = 2; // 0-based: row 3 in sheet
  const dataEnd = dataStart + rows.length;
  const sheetId = 0;

  const thinBorder = {
    style: "SOLID" as const,
    width: 1,
    color: { red: 0.72, green: 0.72, blue: 0.72 },
  };
  const allBorders = {
    top: thinBorder,
    bottom: thinBorder,
    left: thinBorder,
    right: thinBorder,
  };

  const requests: Record<string, unknown>[] = [
    // Title: merge A1:C1
    {
      mergeCells: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 3,
        },
        mergeType: "MERGE_ALL",
      },
    },
    // Title row height (~80px like sample)
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 80 },
        fields: "pixelSize",
      },
    },
    // Title style: bold, larger, centered, wrap
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 3,
        },
        cell: {
          userEnteredFormat: {
            textFormat: {
              bold: true,
              fontSize: 13,
              fontFamily: "Noto Sans JP",
            },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
            borders: {
              bottom: {
                style: "SOLID",
                width: 1,
                color: { red: 0.55, green: 0.55, blue: 0.55 },
              },
            },
          },
        },
        fields:
          "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,wrapStrategy,borders)",
      },
    },
    // Header row
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: 2,
          startColumnIndex: 0,
          endColumnIndex: colCount,
        },
        cell: {
          userEnteredFormat: {
            textFormat: {
              bold: true,
              fontSize: 10,
              fontFamily: "Noto Sans JP",
            },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
            backgroundColor: { red: 0.9, green: 0.93, blue: 0.98 },
            borders: allBorders,
          },
        },
        fields:
          "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,wrapStrategy,backgroundColor,borders)",
      },
    },
    // Header row height
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 1, endIndex: 2 },
        properties: { pixelSize: 36 },
        fields: "pixelSize",
      },
    },
    // Freeze title + header
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 2 },
        },
        fields: "gridProperties.frozenRowCount",
      },
    },
    // Column widths
    ...EXPORT_COLUMN_PIXEL_WIDTHS.map((pixelSize, index) => ({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: index,
          endIndex: index + 1,
        },
        properties: { pixelSize },
        fields: "pixelSize",
      },
    })),
  ];

  if (rows.length > 0) {
    // Data body: light fill, borders, vertical middle, wrap
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dataStart,
          endRowIndex: dataEnd,
          startColumnIndex: 0,
          endColumnIndex: colCount,
        },
        cell: {
          userEnteredFormat: {
            textFormat: {
              fontSize: 10,
              fontFamily: "Noto Sans JP",
            },
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
            backgroundColor: { red: 0.93, green: 0.95, blue: 0.99 },
            borders: allBorders,
          },
        },
        fields:
          "userEnteredFormat(textFormat,verticalAlignment,wrapStrategy,backgroundColor,borders)",
      },
    });

    // Quantity centered
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: dataStart,
          endRowIndex: dataEnd,
          startColumnIndex: QTY_COLUMN_INDEX,
          endColumnIndex: QTY_COLUMN_INDEX + 1,
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(horizontalAlignment,verticalAlignment)",
      },
    });

    // Stronger wrap on product, photo placeholder, notes columns
    for (const col of [PRODUCT_COLUMN_INDEX, PHOTO_COL_INDEX, ...NOTES_COLUMN_INDEXES]) {
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: dataStart,
            endRowIndex: dataEnd,
            startColumnIndex: col,
            endColumnIndex: col + 1,
          },
          cell: {
            userEnteredFormat: {
              wrapStrategy: "WRAP",
              verticalAlignment: "MIDDLE",
              horizontalAlignment: "LEFT",
            },
          },
          fields: "userEnteredFormat(wrapStrategy,verticalAlignment,horizontalAlignment)",
        },
      });
    }

    // Per-row heights so long notes / product names break visibly
    rows.forEach((row, index) => {
      const startIndex = dataStart + index;
      const hasPhoto = Boolean(row.photoBase64 && row.photoMimeType);
      requests.push({
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex,
            endIndex: startIndex + 1,
          },
          properties: { pixelSize: estimateRowHeightPx(row, hasPhoto) },
          fields: "pixelSize",
        },
      });
    });
  }

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ requests }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ||
        "スプレッドシートの書式設定に失敗しました"
    );
  }
}

/**
 * Two-step upload: metadata+parents first, then media.
 * Multipart often dropped parents so files drifted to My Drive root.
 */
async function uploadBinaryFileToDrive(
  accessToken: string,
  base64: string,
  mimeType: string,
  fileName: string,
  parentFolderId: string,
  options?: { makePublic?: boolean; errorLabel?: string }
): Promise<string> {
  const errorLabel = options?.errorLabel ?? "ファイルのアップロードに失敗しました";

  const createRes = await fetch(
    "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,parents",
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        name: sanitizeDriveFileName(fileName),
        mimeType,
        parents: [parentFolderId],
      }),
    }
  );
  const created = await createRes.json();
  if (!createRes.ok) {
    throw new Error(created.error?.message || errorLabel);
  }

  const fileId = created.id as string;
  await ensureExclusiveParent(accessToken, fileId, parentFolderId);

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
      (uploaded as { error?: { message?: string } }).error?.message || errorLabel
    );
  }

  await ensureExclusiveParent(accessToken, fileId, parentFolderId);

  if (options?.makePublic) {
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
  }

  return fileId;
}

async function uploadPhotoToDrive(
  accessToken: string,
  base64: string,
  mimeType: string,
  fileName: string,
  photoFolderId: string
): Promise<string> {
  const fileId = await uploadBinaryFileToDrive(
    accessToken,
    base64,
    mimeType,
    fileName,
    photoFolderId,
    { makePublic: true, errorLabel: "写真のアップロードに失敗しました" }
  );
  return driveImageUrl(fileId);
}

async function uploadSourceFilesToDrive(
  accessToken: string,
  files: DriveSourceFile[],
  sourceFolderId: string,
  onItem?: (done: number, total: number) => void
): Promise<number> {
  if (!files.length) return 0;

  const valid = files.filter((f) => f.base64?.trim());
  const total = valid.length;
  if (!total) return 0;

  const usedNames = new Set<string>();
  let count = 0;

  for (const file of valid) {
    let fileName = sanitizeDriveFileName(file.name);
    if (usedNames.has(fileName)) {
      const dot = fileName.lastIndexOf(".");
      const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
      const ext = dot > 0 ? fileName.slice(dot) : "";
      let n = 2;
      while (usedNames.has(`${stem}_${n}${ext}`)) n++;
      fileName = `${stem}_${n}${ext}`;
    }
    usedNames.add(fileName);

    await uploadBinaryFileToDrive(
      accessToken,
      file.base64,
      file.mimeType,
      fileName,
      sourceFolderId,
      { errorLabel: "元ファイルのアップロードに失敗しました" }
    );
    count++;
    onItem?.(count, total);
  }

  return count;
}

async function attachRowPhotos(
  accessToken: string,
  spreadsheetId: string,
  rows: OcrRow[],
  photoFolderId: string,
  onItem?: (done: number, total: number) => void
): Promise<number> {
  const photoRows = rows
    .map((row, index) => ({
      row,
      sheetRow: index + EXPORT_SHEET_DATA_START_ROW,
    }))
    .filter((item) => item.row.photoBase64 && item.row.photoMimeType);

  if (!photoRows.length) return 0;

  const total = photoRows.length;
  const updates: Array<{ range: string; values: string[][] }> = [];

  for (let i = 0; i < photoRows.length; i++) {
    const { row, sheetRow } = photoRows[i];
    const imageUrl = await uploadPhotoToDrive(
      accessToken,
      row.photoBase64!,
      row.photoMimeType!,
      buildRowPhotoFileName(sheetRow - EXPORT_SHEET_DATA_START_ROW + 1),
      photoFolderId
    );
    const cell = `${columnLetter(PHOTO_COLUMN_INDEX)}${sheetRow}`;
    updates.push({
      range: `${SHEET_TAB_TITLE}!${cell}`,
      values: [[`=IMAGE("${imageUrl}", 1)`]],
    });
    onItem?.(i + 1, total);
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

/** Create the survey folder and upload originals to 元ファイル/ before OCR. */
export async function stageSurveySourceFiles(
  options: StageSurveySourceOptions
): Promise<SurveyDriveStaging> {
  const { accessToken, sourceFiles, folderId, onProgress } = options;
  const projectFolderName = resolveProjectName(options);
  const rootFolderName = resolveRootFolderName(options);
  const valid = sourceFiles?.filter((f) => f.base64?.trim()) ?? [];
  if (!valid.length) {
    throw new Error("アップロードする元ファイルがありません");
  }

  let parent = await ensureParentFolder(accessToken, rootFolderName, folderId);
  if (!(await getParentFolderIfValid(accessToken, parent.id, rootFolderName))) {
    clearCachedParentFolderId();
    parent = await ensureParentFolder(accessToken, rootFolderName, folderId);
  }
  if (!parent?.id) {
    throw new Error("ルートフォルダを作成できませんでした");
  }

  const processFolderId = await createProcessFolder(
    accessToken,
    projectFolderName,
    parent.id,
    parent.name
  );
  const sourceFolderId = await createSourceSubfolder(accessToken, processFolderId);
  const sourceCount = await uploadSourceFilesToDrive(
    accessToken,
    valid,
    sourceFolderId,
    onProgress
  );

  await ensureExclusiveParent(accessToken, sourceFolderId, processFolderId);
  await ensureExclusiveParent(accessToken, processFolderId, parent.id);

  return {
    processFolderId,
    processFolderUrl: driveFolderUrl(processFolderId),
    sourceFolderId,
    sourceCount,
  };
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
        description: "COWELL OCR",
      }),
    }
  );
}

async function exportRowsWithAccessTokenUnlocked(
  options: SheetsExportOptions
): Promise<SheetsExportResult> {
  const {
    accessToken,
    rows,
    folderId,
    sourceFiles,
    existingProcessFolderId,
    skipSourceUpload,
    onProgress,
  } = options;
  const headers = authHeaders(accessToken);
  const projectFolderName = resolveProjectName(options);
  const rootFolderName = resolveRootFolderName(options);
  const spreadsheetName = buildSpreadsheetDriveName(projectFolderName);
  const photoTotal = countPhotoRows(rows);
  const sourceTotal = sourceFiles?.filter((f) => f.base64?.trim()).length ?? 0;
  const shouldUploadSources = sourceTotal > 0 && !skipSourceUpload && Boolean(sourceFiles?.length);

  emitProgress(onProgress, 0, "folders");

  let parent = await ensureParentFolder(accessToken, rootFolderName, folderId);
  if (!(await getParentFolderIfValid(accessToken, parent.id, rootFolderName))) {
    clearCachedParentFolderId();
    parent = await ensureParentFolder(accessToken, rootFolderName, folderId);
  }
  if (!parent?.id) {
    throw new Error("ルートフォルダを作成できませんでした");
  }
  emitProgress(onProgress, 10, "folders");

  let processFolderId = existingProcessFolderId?.trim();
  if (processFolderId) {
    const nested = await fileAppearsInFolder(accessToken, processFolderId, parent.id);
    if (!nested) processFolderId = undefined;
  }

  if (!processFolderId) {
    processFolderId = await createProcessFolder(
      accessToken,
      projectFolderName,
      parent.id,
      parent.name
    );
  }
  emitProgress(onProgress, 15, "folders");

  if (shouldUploadSources) {
    emitProgress(onProgress, 16, "sources", `0 / ${sourceTotal}`);
    const sourceFolderId = await createSourceSubfolder(accessToken, processFolderId);
    await uploadSourceFilesToDrive(
      accessToken,
      sourceFiles!,
      sourceFolderId,
      (done, total) => {
        emitProgress(
          onProgress,
          rangePercent(16, 28, done / total),
          "sources",
          `${done} / ${total}`
        );
      }
    );
    await ensureExclusiveParent(accessToken, sourceFolderId, processFolderId);
    await ensureExclusiveParent(accessToken, processFolderId, parent.id);
  }
  emitProgress(onProgress, shouldUploadSources ? 28 : 20, "spreadsheet");

  const photoFolderId = await createPhotoSubfolder(accessToken, processFolderId);
  emitProgress(onProgress, shouldUploadSources ? 30 : 22, "spreadsheet");

  const spreadsheetId = await createResultSpreadsheet(
    accessToken,
    processFolderId,
    spreadsheetName
  );
  emitProgress(onProgress, 28, "spreadsheet");

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=RAW`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({ values: buildSheetValues(rows, projectFolderName) }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json();
    throw new Error(err.error?.message || "データの書き込みに失敗しました");
  }

  await formatExportedSpreadsheet(accessToken, spreadsheetId, rows);
  emitProgress(onProgress, 35, "spreadsheet");

  let photoCount = 0;
  if (photoTotal > 0) {
    emitProgress(onProgress, 36, "photos", `0 / ${photoTotal}`);
    photoCount = await attachRowPhotos(
      accessToken,
      spreadsheetId,
      rows,
      photoFolderId,
      (done, total) => {
        emitProgress(
          onProgress,
          rangePercent(36, 75, done / total),
          "photos",
          `${done} / ${total}`
        );
      }
    );
    await ensureExclusiveParent(accessToken, photoFolderId, processFolderId);
    await ensureExclusiveParent(accessToken, processFolderId, parent.id);
  }
  emitProgress(onProgress, 75, photoTotal > 0 ? "photos" : "finishing");

  await touchSpreadsheetFile(accessToken, spreadsheetId);

  // Final guarantee: survey folder only under chosen root (not also My Drive root)
  await ensureExclusiveParent(accessToken, processFolderId, parent.id);
  emitProgress(onProgress, 100, "finishing");

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    rowCount: rows.length,
    photoCount,
    processFolderId,
    processFolderUrl: driveFolderUrl(processFolderId),
    parentFolderId: parent.id,
    parentFolderUrl: driveFolderUrl(parent.id),
    parentFolderName: parent.name,
  };
}

/**
 * Export one survey under the chosen root folder only (never also under My Drive root).
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
