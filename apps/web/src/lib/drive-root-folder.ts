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

/**
 * Export fallback only — never use this to invent UI dropdown options.
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
          const cleaned = normalizeFolderNameInput(item.name);
          if (!cleaned) continue;
          history.push({
            name: cleaned,
            id: item.id?.trim() || undefined,
          });
        }
      }
    }

    const active = localStorage.getItem(ACTIVE_ACCOUNT_KEY)?.trim();
    if (!active) return {};

    const cleanedName = normalizeFolderNameInput(name || undefined);
    const map: PrefsMap = {
      [accountKey(active)]: {
        lastRootName: cleanedName,
        lastRootId: id || undefined,
        history: history.length
          ? history
          : cleanedName
            ? [{ name: cleanedName, id: id || undefined }]
            : [],
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
      lastRootName: normalizeFolderNameInput(existing.lastRootName),
      lastRootId: existing.lastRootId?.trim() || undefined,
      history: Array.isArray(existing.history) ? existing.history : [],
    };
  }
  return {
    lastRootName: "",
    history: [],
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
    return { name: "" };
  }
  const prefs = getAccountPrefs(account);
  return {
    name: normalizeFolderNameInput(prefs.lastRootName),
    id: prefs.lastRootId,
  };
}

export function writeLastRootFolder(
  pref: DriveRootFolderPref,
  email?: string | null
): void {
  const account = email?.trim() || readActiveDriveAccountEmail();
  if (!account) return;

  const name = normalizeFolderNameInput(pref.name);
  if (!name) {
    saveAccountPrefs(account, {
      lastRootName: "",
      lastRootId: undefined,
      history: getAccountPrefs(account).history,
    });
    return;
  }

  const prefs = getAccountPrefs(account);
  const id = pref.id?.trim() || undefined;
  const history: DriveRootFolderPref[] = [{ name, id }];
  for (const item of prefs.history) {
    const itemName = normalizeFolderNameInput(item.name);
    if (!itemName || itemName.toLowerCase() === name.toLowerCase()) continue;
    history.push({
      name: itemName,
      id: item.id?.trim() || undefined,
    });
  }

  saveAccountPrefs(account, {
    lastRootName: name,
    lastRootId: id,
    history: history.slice(0, MAX_HISTORY),
  });
}

export function readRootFolderHistory(email?: string | null): DriveRootFolderPref[] {
  const account = email?.trim() || readActiveDriveAccountEmail();
  if (!account) return [];

  const prefs = getAccountPrefs(account);
  const seen = new Set<string>();
  const items: DriveRootFolderPref[] = [];
  for (const item of prefs.history) {
    const name = normalizeFolderNameInput(item.name);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ name, id: item.id?.trim() || undefined });
  }
  return items.slice(0, MAX_HISTORY);
}

/**
 * Dropdown source of truth = live Drive folders only.
 * History only reorders / prefers recently used names that still exist.
 * Never invents a default folder (e.g. JBC-COWELL) that is gone from Drive.
 */
export function mergeRootFolderOptions(
  live: DriveRootFolderPref[],
  history: DriveRootFolderPref[] = []
): DriveRootFolderPref[] {
  const liveByName = new Map<string, DriveRootFolderPref>();
  for (const item of live) {
    const name = normalizeFolderNameInput(item.name);
    if (!name || !item.id?.trim()) continue;
    const key = name.toLowerCase();
    if (!liveByName.has(key)) {
      liveByName.set(key, { name, id: item.id.trim() });
    }
  }

  const seen = new Set<string>();
  const out: DriveRootFolderPref[] = [];

  for (const item of history) {
    const key = normalizeFolderNameInput(item.name).toLowerCase();
    if (!key || seen.has(key)) continue;
    const liveMatch = liveByName.get(key);
    if (!liveMatch) continue;
    seen.add(key);
    out.push(liveMatch);
  }

  for (const item of liveByName.values()) {
    const key = item.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

/**
 * Drop cached roots that no longer exist in Drive. Clears last-used when deleted.
 * Returns the pruned live-only option list for the combobox.
 */
export function syncRootFolderHistoryWithLive(
  email: string,
  live: DriveRootFolderPref[]
): DriveRootFolderPref[] {
  const account = email.trim();
  if (!account) return mergeRootFolderOptions(live, []);

  const liveNormalized: DriveRootFolderPref[] = [];
  const liveById = new Map<string, DriveRootFolderPref>();
  const liveByName = new Map<string, DriveRootFolderPref>();
  for (const item of live) {
    const name = normalizeFolderNameInput(item.name);
    const id = item.id?.trim();
    if (!name || !id) continue;
    const pref = { name, id };
    liveNormalized.push(pref);
    liveById.set(id, pref);
    liveByName.set(name.toLowerCase(), pref);
  }

  const prefs = getAccountPrefs(account);
  const history: DriveRootFolderPref[] = [];
  const seen = new Set<string>();
  for (const item of prefs.history) {
    const byId = item.id?.trim() ? liveById.get(item.id.trim()) : undefined;
    const byName = liveByName.get(normalizeFolderNameInput(item.name).toLowerCase());
    const match = byId || byName;
    if (!match) continue;
    const key = match.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    history.push(match);
  }

  const lastById = prefs.lastRootId?.trim()
    ? liveById.get(prefs.lastRootId.trim())
    : undefined;
  const lastByName = liveByName.get(normalizeFolderNameInput(prefs.lastRootName).toLowerCase());
  const last = lastById || lastByName;

  saveAccountPrefs(account, {
    lastRootName: last?.name || "",
    lastRootId: last?.id,
    history: history.slice(0, MAX_HISTORY),
  });

  return mergeRootFolderOptions(liveNormalized, history);
}

/** Resolve a typed/selected root against the live Drive list. */
export function findLiveRootFolder(
  live: DriveRootFolderPref[],
  name: string,
  id?: string
): DriveRootFolderPref | undefined {
  const normalized = normalizeFolderNameInput(name);
  const wantedId = id?.trim();

  // Typed/selected name is source of truth — never keep a stale id from another folder
  // (e.g. "JBC-COWELL 2" → "JBC-COWELL" must not resolve to the "2" folder's id).
  if (normalized) {
    const byName = live.find(
      (o) => normalizeFolderNameInput(o.name).toLowerCase() === normalized.toLowerCase()
    );
    if (byName?.id) {
      return { name: normalizeFolderNameInput(byName.name), id: byName.id.trim() };
    }
    return undefined;
  }

  if (wantedId) {
    const byId = live.find((o) => o.id === wantedId);
    const id = byId?.id?.trim();
    if (byId && id) {
      return {
        name: normalizeFolderNameInput(byId.name),
        id,
      };
    }
  }

  return undefined;
}
