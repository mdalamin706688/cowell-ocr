/** Errors from browser translate / Framer Motion DOM races — never hard-reload. */

export function isDomMutationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { name?: string; message?: string; digest?: string };
  const name = err.name ?? "";
  const message = (err.message ?? "").toLowerCase();
  return (
    name === "NotFoundError" ||
    name === "DOMException" ||
    message.includes("removechild") ||
    message.includes("insertbefore") ||
    message.includes("child of") ||
    message.includes("hydrat") ||
    message.includes("the node to be removed is not a child") ||
    // Next production often strips the real message but keeps a digest.
    (Boolean(err.digest) && (message === "" || message.includes("application error")))
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

/** Soft-recoverable render/nav errors — show error UI only if reset keeps failing. */
export function isSoftRecoverableError(error: unknown): boolean {
  return isDomMutationError(error) || isChunkLoadError(error);
}

/**
 * Soft-nav must stay SPA. Never auto location.reload() here.
 */
export function recoverFromChunkLoadError(_error: unknown): boolean {
  return false;
}
