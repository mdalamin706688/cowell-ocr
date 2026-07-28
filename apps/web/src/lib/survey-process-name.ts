import { normalizeFolderNameInput, sanitizeRootFolderName } from "./drive-root-folder";

const pad = (n: number) => String(n).padStart(2, "0");

/** Strip invalid chars; empty stays empty (for form validation). */
export function normalizeProjectNameInput(projectName?: string): string {
  return (projectName ?? "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .slice(0, 120);
}

/** Drive folder name = project name (fallback only when exporting without a name). */
export function sanitizeProjectFolderName(projectName?: string): string {
  return normalizeProjectNameInput(projectName) || "現調";
}

/** Spreadsheet file name: {project name}_yyyymmdd */
export function buildSpreadsheetDriveName(projectName?: string, date = new Date()): string {
  const folder = sanitizeProjectFolderName(projectName);
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("");
  return `${folder}_${stamp}`;
}

/** Drive photo file name for a spreadsheet data row (1-based). */
export function buildRowPhotoFileName(rowNumber: number): string {
  return `写真_${rowNumber}行目.jpg`;
}

/** UI preview of the Drive layout for one export. */
export function buildDriveExportPreview(
  projectName?: string,
  rootFolderName?: string
): string {
  const root = normalizeFolderNameInput(rootFolderName) || "（ルート未選択）";
  const folder = normalizeProjectNameInput(projectName) || "（案件名）";
  const sheet = normalizeProjectNameInput(projectName)
    ? buildSpreadsheetDriveName(projectName)
    : "（シート）";
  return `${root}/${folder}/（元ファイル/, 画像/, ${sheet}）`;
}

/** @deprecated Use sanitizeProjectFolderName */
export function buildSurveyProcessName(projectName?: string): string {
  return sanitizeProjectFolderName(projectName);
}

export { sanitizeRootFolderName };
