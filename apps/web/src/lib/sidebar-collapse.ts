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

function syncDocumentClass(collapsed: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(SIDEBAR_COLLAPSED_CLASS, collapsed);
}

/** Eager client hydrate — matches blocking script in root layout. */
let memoryCollapsed =
  typeof window !== "undefined" ? readStorage() : false;
if (typeof document !== "undefined") {
  syncDocumentClass(memoryCollapsed);
}

const listeners = new Set<Listener>();

function writeStorage(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // ignore storage restriction
  }
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getSidebarCollapsedSnapshot(): boolean {
  return memoryCollapsed;
}

/**
 * Prefer the pre-paint <html> class so hydration matches what the user already sees
 * (blocking script), instead of always returning expanded=false.
 */
export function getSidebarCollapsedServerSnapshot(): boolean {
  if (typeof document !== "undefined") {
    return document.documentElement.classList.contains(SIDEBAR_COLLAPSED_CLASS);
  }
  return false;
}

export function subscribeSidebarCollapsed(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSidebarCollapsed(collapsed: boolean): void {
  memoryCollapsed = collapsed;
  writeStorage(collapsed);
  syncDocumentClass(collapsed);
  emit();
}

export function hydrateSidebarCollapsedFromStorage(): void {
  setSidebarCollapsed(readStorage());
}

export function toggleSidebarCollapsed(): void {
  setSidebarCollapsed(!memoryCollapsed);
}
