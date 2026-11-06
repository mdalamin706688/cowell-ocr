"use client";

import { usePathname } from "next/navigation";
import { isLoginRoute, LoginSkeleton } from "@/components/layout/content-skeleton";
import { useNavigation } from "@/contexts/navigation-context";
import { useSafeMotion } from "@/hooks/use-safe-motion";

function normalizePath(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}

/**
 * Full-screen overlay only when crossing into/out of login.
 * Never show ShellSkeleton here — that remounts the rail and feels like a
 * full refresh when the real sidebar was already collapsed.
 */
export function NavigationRouteSkeleton() {
  const pathname = usePathname();
  const { isNavigating, pendingHref } = useNavigation();
  const safeMotion = useSafeMotion();

  if (!safeMotion || !isNavigating || !pendingHref) return null;
  if (normalizePath(pathname) === normalizePath(pendingHref)) return null;

  const currentIsLogin = isLoginRoute(pathname);
  const targetIsLogin = isLoginRoute(pendingHref);
  // Workspace ↔ workspace: keep live AppShell (including collapsed rail).
  if (currentIsLogin === targetIsLogin) return null;
  // Leaving login → workspace: AppShell mounts itself; no fake shell overlay.
  if (!targetIsLogin) return null;

  return (
    <div className="fixed inset-0 z-[90] overflow-auto paper-canvas" aria-busy aria-live="polite">
      <LoginSkeleton />
    </div>
  );
}
