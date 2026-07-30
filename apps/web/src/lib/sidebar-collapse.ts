/** Shared collapsed-sidebar preference — synced to <html> before paint. */

export const SIDEBAR_COLLAPSED_KEY = "cowell_sidebar_collapsed";
export const SIDEBAR_COLLAPSED_CLASS = "sidebar-collapsed";

type Listener = () => void;

function readStorage(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStorage(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // ignore storage restriction
  }
}

function syncDocumentClass(collapsed: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(SIDEBAR_COLLAPSED_CLASS, collapsed);
  document.documentElement.classList.add("sidebar-state-ready");
}

/** User preference (localStorage). */
let preferenceCollapsed =
  typeof window !== "undefined" ? readStorage() : false;

/**
 * Temporary override (e.g. survey review focus). null = use preference.
 * Never written to localStorage — leaving a page cannot “expand” a collapsed user preference.
 */
let overrideCollapsed: boolean | null = null;

const listeners = new Set<Listener>();

function effectiveCollapsed(): boolean {
  return overrideCollapsed ?? preferenceCollapsed;
}

function emit(): void {
  const next = effectiveCollapsed();
  syncDocumentClass(next);
  listeners.forEach((listener) => listener());
}

if (typeof document !== "undefined") {
  syncDocumentClass(effectiveCollapsed());
}

export function getSidebarCollapsedSnapshot(): boolean {
  return effectiveCollapsed();
}

export function getSidebarCollapsedServerSnapshot(): boolean {
  if (typeof document !== "undefined") {
    return document.documentElement.classList.contains(SIDEBAR_COLLAPSED_CLASS);
  }
  return false;
}

export function getSidebarPreferenceSnapshot(): boolean {
  return preferenceCollapsed;
}

export function subscribeSidebarCollapsed(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Persist user preference (collapse toggle). Clears temporary override. */
export function setSidebarCollapsed(collapsed: boolean): void {
  preferenceCollapsed = collapsed;
  overrideCollapsed = null;
  writeStorage(collapsed);
  emit();
}

/** Temporary visual override — does not change stored preference. */
export function setSidebarCollapsedOverride(collapsed: boolean | null): void {
  if (overrideCollapsed === collapsed) return;
  overrideCollapsed = collapsed;
  emit();
}

export function hydrateSidebarCollapsedFromStorage(): void {
  preferenceCollapsed = readStorage();
  emit();
}

export function toggleSidebarCollapsed(): void {
  setSidebarCollapsed(!preferenceCollapsed);
}
