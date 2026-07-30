import type { SessionUser } from "@/lib/client-auth";
import { peekClientSession } from "@/lib/client-auth";

/**
 * Tab-lifetime workspace session — survives AuthenticatedShell remounts so we
 * never flash ShellSkeleton mid soft-nav (looks like a full CloudFront reload).
 */
let shellUser: SessionUser | null = null;
let shellReady = false;

export function getShellSessionUser(): SessionUser | null {
  if (shellUser) return shellUser;
  if (typeof window === "undefined") return null;
  try {
    return peekClientSession();
  } catch {
    return null;
  }
}

export function isShellSessionReady(): boolean {
  return shellReady || Boolean(getShellSessionUser());
}

export function setShellSessionUser(user: SessionUser | null): void {
  shellUser = user;
  shellReady = Boolean(user);
}

export function clearShellSessionUser(): void {
  shellUser = null;
  shellReady = false;
}
