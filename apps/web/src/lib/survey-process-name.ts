const pad = (n: number) => String(n).padStart(2, "0");

/** Main Drive folder name = project name (invalid chars stripped). */
export function sanitizeProjectFolderName(projectName?: string): string {
  const name = (projectName ?? "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .slice(0, 120);
  return name || "現調";
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

/** UI preview of the Drive layout for one export. */
export function buildDriveExportPreview(projectName?: string): string {
  const folder = sanitizeProjectFolderName(projectName);
  const sheet = buildSpreadsheetDriveName(projectName);
  return `${folder}/（画像/, ${sheet}, 元ファイル）`;
}

/** @deprecated Use sanitizeProjectFolderName — kept for CSV download titles */
export function buildSurveyProcessName(projectName?: string): string {
  return sanitizeProjectFolderName(projectName);
}
