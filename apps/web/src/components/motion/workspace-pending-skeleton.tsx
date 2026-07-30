"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  isLoginRoute,
  RouteContentSkeleton,
} from "@/components/layout/content-skeleton";
import { normalizeRoutePath, useNavigation } from "@/contexts/navigation-context";
import { SKELETON_SHOW_DELAY_MS } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Overlay skeleton — keeps previous layout box (min-height lock) so the page
 * doesn’t jump when route chunks swap underneath.
 */
export function WorkspacePendingSkeleton({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { pendingHref } = useNavigation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [skeletonHref, setSkeletonHref] = useState<string | null>(null);
  const [lockedHeight, setLockedHeight] = useState<number | undefined>(undefined);

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
      setLockedHeight(undefined);
      return;
    }

    const timer = window.setTimeout(() => {
      const height = wrapRef.current?.offsetHeight;
      if (height && height > 0) setLockedHeight(height);
      setSkeletonHref(target);
      setVisible(true);
    }, SKELETON_SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [pending, target]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      style={lockedHeight ? { minHeight: lockedHeight } : undefined}
    >
      <div
        className={cn(visible && "invisible pointer-events-none select-none")}
        aria-hidden={visible}
      >
        {children}
      </div>
      {visible && skeletonHref ? (
        <div
          className="absolute inset-x-0 top-0 z-10 w-full rounded-none bg-background"
          aria-busy
          aria-live="polite"
        >
          <RouteContentSkeleton href={skeletonHref} />
        </div>
      ) : null}
    </div>
  );
}
