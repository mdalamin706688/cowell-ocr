"use client";

import { usePathname } from "next/navigation";
import {
  isLoginRoute,
  RouteContentSkeleton,
} from "@/components/layout/content-skeleton";
import { normalizeRoutePath, useNavigation } from "@/contexts/navigation-context";

/**
 * Instant destination skeleton while the next route chunk mounts.
 * Uses the same skeleton components as page placeholders for a seamless handoff.
 */
export function WorkspacePendingSkeleton({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { pendingHref } = useNavigation();

  const pending =
    Boolean(pendingHref) &&
    normalizeRoutePath(pendingHref!) !== normalizeRoutePath(pathname) &&
    !isLoginRoute(pathname) &&
    !isLoginRoute(pendingHref!);

  if (pending && pendingHref) {
    return (
      <div className="min-h-[560px] w-full" aria-busy aria-live="polite">
        <RouteContentSkeleton href={pendingHref} />
      </div>
    );
  }

  return <div className="min-h-[560px] w-full">{children}</div>;
}
