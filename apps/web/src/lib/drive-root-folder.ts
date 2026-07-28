export const DEFAULT_DRIVE_ROOT_FOLDER_NAME = "JBC-COWELL";

const ACTIVE_ACCOUNT_KEY = "cowell_drive_active_account";
const PREFS_BY_ACCOUNT_KEY = "cowell_drive_prefs_by_account_v1";
const MAX_HISTORY = 12;

export interface DriveRootFolderPref {
  id?: string;
  name: string;
}

interface AccountDrivePrefs {
  lastRootName: string;
  lastRootId?: string;
  history: DriveRootFolderPref[];
}

type PrefsMap = Record<string, AccountDrivePrefs>;

function canUseStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function accountKey(email: string): string {
  return email.trim().toLowerCase();
}

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

function readPrefsMap(): PrefsMap {
  if (!canUseStorage()) return {};
  try {
    const raw = localStorage.getItem(PREFS_BY_ACCOUNT_KEY);
    if (!raw) return migrateLegacyPrefs();
    const parsed = JSON.parse(raw) as PrefsMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePrefsMap(map: PrefsMap): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(PREFS_BY_ACCOUNT_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/** One-time migrate old global keys into the active account bucket when known. */
function migrateLegacyPrefs(): PrefsMap {
  if (!canUseStorage()) return {};
  try {
    const name = localStorage.getItem("cowell_drive_root_folder_name")?.trim();
    const id = localStorage.getItem("cowell_drive_root_folder_id")?.trim();
    const histRaw = localStorage.getItem("cowell_drive_root_folder_history");
    if (!name && !histRaw) return {};

    const history: DriveRootFolderPref[] = [];
    if (histRaw) {
      const parsed = JSON.parse(histRaw) as DriveRootFolderPref[];
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!item?.name) continue;
          history.push({
            name: sanitizeRootFolderName(item.name),
            id: item.id?.trim() || undefined,
          });
        }
      }
    }

    const active = localStorage.getItem(ACTIVE_ACCOUNT_KEY)?.trim();
    if (!active) {
      // Keep legacy until an account connects; still return empty map
      return {};
    }

    const map: PrefsMap = {
      [accountKey(active)]: {
        lastRootName: sanitizeRootFolderName(name || undefined),
        lastRootId: id || undefined,
        history: history.length
          ? history
          : [{ name: sanitizeRootFolderName(name || undefined), id: id || undefined }],
      },
    };
    writePrefsMap(map);
    return map;
  } catch {
    return {};
  }
}

export function setActiveDriveAccountEmail(email: string | null): void {
  if (!canUseStorage()) return;
  try {
    if (!email) localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    else localStorage.setItem(ACTIVE_ACCOUNT_KEY, email.trim());
  } catch {
    // ignore
  }
}

export function readActiveDriveAccountEmail(): string | null {
  if (!canUseStorage()) return null;
  try {
    return localStorage.getItem(ACTIVE_ACCOUNT_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

function getAccountPrefs(email: string): AccountDrivePrefs {
  const map = readPrefsMap();
  const key = accountKey(email);
  const existing = map[key];
  if (existing) {
    return {
      lastRootName: sanitizeRootFolderName(existing.lastRootName),
      lastRootId: existing.lastRootId,
      history: Array.isArray(existing.history) ? existing.history : [],
    };
  }
  return {
    lastRootName: DEFAULT_DRIVE_ROOT_FOLDER_NAME,
    history: [{ name: DEFAULT_DRIVE_ROOT_FOLDER_NAME }],
  };
}

function saveAccountPrefs(email: string, prefs: AccountDrivePrefs): void {
  const map = readPrefsMap();
  map[accountKey(email)] = prefs;
  writePrefsMap(map);
  setActiveDriveAccountEmail(email);
}

export function readLastRootFolder(email?: string | null): DriveRootFolderPref {
  const account = email?.trim() || readActiveDriveAccountEmail();
  if (!account) {
    return { name: DEFAULT_DRIVE_ROOT_FOLDER_NAME };
  }
  const prefs = getAccountPrefs(account);
  return {
    name: sanitizeRootFolderName(prefs.lastRootName),
    id: prefs.lastRootId,
  };
}

export function writeLastRootFolder(
  pref: DriveRootFolderPref,
  email?: string | null
): void {
  const account = email?.trim() || readActiveDriveAccountEmail();
  if (!account) return;

  const name = sanitizeRootFolderName(pref.name);
  const prefs = getAccountPrefs(account);
  const history = [{ name, id: pref.id?.trim() || undefined }];
  for (const item of prefs.history) {
    if (item.name.toLowerCase() === name.toLowerCase()) continue;
    history.push({
      name: sanitizeRootFolderName(item.name),
      id: item.id?.trim() || undefined,
    });
  }

  saveAccountPrefs(account, {
    lastRootName: name,
    lastRootId: pref.id?.trim() || undefined,
    history: history.slice(0, MAX_HISTORY),
  });
}

export function readRootFolderHistory(email?: string | null): DriveRootFolderPref[] {
  const account = email?.trim() || readActiveDriveAccountEmail();
  if (!account) return [{ name: DEFAULT_DRIVE_ROOT_FOLDER_NAME }];

  const prefs = getAccountPrefs(account);
  const seen = new Set<string>();
  const items: DriveRootFolderPref[] = [];
  for (const item of prefs.history) {
    const name = sanitizeRootFolderName(item.name);
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ name, id: item.id?.trim() || undefined });
  }
  if (!items.some((i) => i.name === DEFAULT_DRIVE_ROOT_FOLDER_NAME)) {
    items.push({ name: DEFAULT_DRIVE_ROOT_FOLDER_NAME });
  }
  return items.slice(0, MAX_HISTORY);
}

/** Merge Drive-listed folders for the connected account; prefer live ids. */
export function mergeRootFolderOptions(
  live: DriveRootFolderPref[],
  history: DriveRootFolderPref[] = []
): DriveRootFolderPref[] {
  const seen = new Set<string>();
  const out: DriveRootFolderPref[] = [];

  for (const item of [...live, ...history]) {
    const name = sanitizeRootFolderName(item.name);
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, id: item.id });
  }

  if (!out.some((i) => i.name === DEFAULT_DRIVE_ROOT_FOLDER_NAME)) {
    out.unshift({ name: DEFAULT_DRIVE_ROOT_FOLDER_NAME });
  }

  return out;
}
