"use client";

import { usePathname } from "next/navigation";
import { isLoginRoute, LoginSkeleton } from "@/components/layout/content-skeleton";
import { ShellSkeleton } from "@/components/layout/shell-skeleton";
import { useNavigation } from "@/contexts/navigation-context";
import { useSafeMotion } from "@/hooks/use-safe-motion";

function normalizePath(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}

/** Full-screen skeleton while crossing layout boundaries (e.g. logout → login) */
export function NavigationRouteSkeleton() {
  const pathname = usePathname();
  const { isNavigating, pendingHref } = useNavigation();
  const safeMotion = useSafeMotion();

  if (!safeMotion || !isNavigating || !pendingHref) return null;
  if (normalizePath(pathname) === normalizePath(pendingHref)) return null;

  return (
    <div className="fixed inset-0 z-[90] overflow-auto paper-canvas" aria-busy aria-live="polite">
      {isLoginRoute(pendingHref) ? <LoginSkeleton /> : <ShellSkeleton />}
    </div>
  );
}
