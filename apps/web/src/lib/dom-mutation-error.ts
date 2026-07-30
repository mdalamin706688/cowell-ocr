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
