"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  isLoginRoute,
  RouteContentSkeleton,
} from "@/components/layout/content-skeleton";
import { useNavigation } from "@/contexts/navigation-context";
import { cn } from "@/lib/utils";

/**
 * Soft-nav overlay with a one-shot height lock (no layout thrash / update loops).
 */
export function WorkspacePendingSkeleton({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { pendingHref } = useNavigation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const lockedRef = useRef<number | null>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);

  const show =
    Boolean(pendingHref) &&
    !isLoginRoute(pathname) &&
    !isLoginRoute(pendingHref!);

  useLayoutEffect(() => {
    const node = wrapRef.current;
    if (!node) return;

    if (show) {
      if (lockedRef.current == null) {
        const h = Math.max(node.getBoundingClientRect().height, 560);
        lockedRef.current = h;
        setLockedHeight(h);
      }
      return;
    }

    if (lockedRef.current != null) {
      lockedRef.current = null;
      setLockedHeight(null);
    }
  }, [show]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full min-h-[560px]"
      style={
        lockedHeight != null
          ? { height: lockedHeight, overflow: "hidden" }
          : undefined
      }
    >
      <div
        className={cn(show && "pointer-events-none select-none opacity-0")}
        aria-hidden={show}
      >
        {children}
      </div>
      {show && pendingHref ? (
        <div
          className="absolute inset-0 z-10 overflow-hidden paper-canvas"
          aria-busy
          aria-live="polite"
        >
          <RouteContentSkeleton href={pendingHref} />
        </div>
      ) : null}
    </div>
  );
}
