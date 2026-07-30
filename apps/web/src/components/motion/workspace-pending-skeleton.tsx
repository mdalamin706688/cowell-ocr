"use client";

import { usePathname } from "next/navigation";
import {
  isLoginRoute,
  RouteContentSkeleton,
} from "@/components/layout/content-skeleton";
import { normalizeRoutePath, useNavigation } from "@/contexts/navigation-context";
import { cn } from "@/lib/utils";

/**
 * Single route skeleton overlay. Children stay mounted underneath so there is
 * no second skeleton remount when the destination page loads.
 */
export function WorkspacePendingSkeleton({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { pendingHref } = useNavigation();

  const show =
    Boolean(pendingHref) &&
    !isLoginRoute(pathname) &&
    !isLoginRoute(pendingHref!);

  const skeletonHref =
    pendingHref && normalizeRoutePath(pendingHref) !== normalizeRoutePath(pathname)
      ? pendingHref
      : pendingHref || pathname;

  return (
    <div className="relative min-h-[560px] w-full">
      <div
        className={cn(show && "invisible pointer-events-none select-none")}
        aria-hidden={show}
      >
        {children}
      </div>
      {show && skeletonHref ? (
        <div className="absolute inset-x-0 top-0 z-10 w-full bg-background" aria-busy aria-live="polite">
          <RouteContentSkeleton href={skeletonHref} />
        </div>
      ) : null}
    </div>
  );
}
