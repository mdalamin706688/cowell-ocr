/** Errors from browser translate / Framer Motion DOM races — never hard-reload. */

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
 * Static export / CloudFront: stale JS chunk after deploy.
 * Detect only — callers should soft-recover (reset), not auto-reload soft-nav.
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

/**
 * Soft-nav must stay SPA. Auto `location.reload()` after a skeleton looked like a
 * full CloudFront refresh. Only return true so callers can soft-reset; never reload here.
 */
export function recoverFromChunkLoadError(_error: unknown): boolean {
  return false;
}
