export const DEFAULT_DRIVE_ROOT_FOLDER_NAME = "JBC-COWELL";

/**
 * The export root is always this fixed folder — users never pick or type it.
 * NEXT_PUBLIC_GOOGLE_SHEETS_FOLDER_ID optionally pins the exact Drive folder;
 * otherwise the app finds or creates DEFAULT_DRIVE_ROOT_FOLDER_NAME under My Drive.
 */
export function getFixedDriveRootFolderId(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_SHEETS_FOLDER_ID?.trim() || undefined;
}

/**
 * Export fallback only — never use this to invent UI options.
 * Empty input becomes the default app root name for backend resolve.
 */
export function sanitizeRootFolderName(name?: string): string {
  const cleaned = normalizeFolderNameInput(name);
  return cleaned || DEFAULT_DRIVE_ROOT_FOLDER_NAME;
}

/** UI input: strip invalid chars but allow empty (no default selection). */
export function normalizeFolderNameInput(name?: string): string {
  return (name ?? "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .slice(0, 120);
}
