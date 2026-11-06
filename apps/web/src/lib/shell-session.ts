import type { SessionUser } from "@/lib/client-auth";
import { peekClientSession } from "@/lib/client-auth";

/**
 * Tab-lifetime workspace shell lock.
 * Once the real AppShell has painted, never swap it for ShellSkeleton again
 * in this tab — that flash is what looked like a CloudFront full reload.
 */
let shellUser: SessionUser | null = null;
let shellLocked = false;

export function getShellSessionUser(): SessionUser | null {
  if (shellUser) return shellUser;
  if (typeof window === "undefined") return null;
  try {
    return peekClientSession();
  } catch {
    return null;
  }
}

export function isShellLocked(): boolean {
  return shellLocked;
}

export function isShellSessionReady(): boolean {
  return shellLocked || Boolean(getShellSessionUser());
}

export function setShellSessionUser(user: SessionUser | null): void {
  if (!user) {
    shellUser = null;
    return;
  }
  shellUser = user;
  shellLocked = true;
}

export function clearShellSessionUser(): void {
  shellUser = null;
  shellLocked = false;
}
