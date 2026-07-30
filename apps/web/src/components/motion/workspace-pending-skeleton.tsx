"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  isLoginRoute,
  RouteContentSkeleton,
} from "@/components/layout/content-skeleton";
import { normalizeRoutePath, useNavigation } from "@/contexts/navigation-context";
import { SKELETON_SHOW_DELAY_MS } from "@/lib/motion";

/**
 * Content-area route skeleton (sidebar / shell stay mounted).
 *
 * Delayed show so fast local navigations keep the previous page (no flicker).
 * Slower CloudFront chunk loads get a premium destination-matched shimmer.
 */
export function WorkspacePendingSkeleton({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { pendingHref } = useNavigation();
  const [visible, setVisible] = useState(false);
  const [skeletonHref, setSkeletonHref] = useState<string | null>(null);

  const target = pendingHref;
  const pending =
    Boolean(target) &&
    normalizeRoutePath(target!) !== normalizeRoutePath(pathname) &&
    !isLoginRoute(pathname) &&
    !isLoginRoute(target!);

  useEffect(() => {
    if (!pending || !target) {
      setVisible(false);
      setSkeletonHref(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setSkeletonHref(target);
      setVisible(true);
    }, SKELETON_SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [pending, target]);

  if (visible && skeletonHref) {
    return (
      <div className="w-full animate-[routeSkeletonIn_160ms_ease-out]" aria-busy aria-live="polite">
        <RouteContentSkeleton href={skeletonHref} />
      </div>
    );
  }

  return <>{children}</>;
}
