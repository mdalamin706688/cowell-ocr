/** Shared collapsed-sidebar preference — keeps shell + skeleton in sync. */

export const SIDEBAR_COLLAPSED_KEY = "cowell_sidebar_collapsed";

type Listener = () => void;

/** In-memory only during render — hydrate from localStorage after mount. */
let memoryCollapsed = false;
const listeners = new Set<Listener>();

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

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getSidebarCollapsedSnapshot(): boolean {
  return memoryCollapsed;
}

export function getSidebarCollapsedServerSnapshot(): boolean {
  return false;
}

export function subscribeSidebarCollapsed(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSidebarCollapsed(collapsed: boolean): void {
  if (memoryCollapsed === collapsed) {
    writeStorage(collapsed);
    return;
  }
  memoryCollapsed = collapsed;
  writeStorage(collapsed);
  emit();
}

/** Call once after mount so SSR HTML matches first client paint. */
export function hydrateSidebarCollapsedFromStorage(): void {
  setSidebarCollapsed(readStorage());
}

export function toggleSidebarCollapsed(): void {
  setSidebarCollapsed(!memoryCollapsed);
}
