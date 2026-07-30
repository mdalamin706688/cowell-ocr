/** Errors from browser translate / Framer Motion DOM races — recover without full reload. */

export function isDomMutationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { name?: string; message?: string };
  const name = err.name ?? "";
  const message = err.message ?? "";
  return (
    name === "NotFoundError" ||
    name === "DOMException" ||
    message.includes("removeChild") ||
    message.includes("insertBefore") ||
    message.includes("child of") ||
    message.toLowerCase().includes("hydrat")
  );
}

export function isDomMutationErrorEvent(message: string, name: string): boolean {
  return isDomMutationError({ name, message });
}

/**
 * Static export / CloudFront: stale or flaky JS chunk fetches after deploy or
 * soft-nav. Recover with a single reload (guarded against loops).
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { name?: string; message?: string };
  const name = err.name ?? "";
  const message = (err.message ?? "").toLowerCase();
  return (
    name === "ChunkLoadError" ||
    message.includes("loading chunk") ||
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("importing a module script failed") ||
    (message.includes("failed to fetch") && message.includes("chunk"))
  );
}

const CHUNK_RELOAD_KEY = "cowell_chunk_reload_at";

/** Returns true if a reload was triggered. */
export function recoverFromChunkLoadError(error: unknown): boolean {
  if (typeof window === "undefined") return false;
  if (!isChunkLoadError(error)) return false;

  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || "0");
    const now = Date.now();
    // Avoid reload loops if the chunk is permanently missing.
    if (last && now - last < 15_000) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
  } catch {
    // sessionStorage blocked — still try once
  }

  window.location.reload();
  return true;
}
