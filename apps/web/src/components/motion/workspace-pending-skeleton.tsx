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
 * Zero-jump soft nav:
 * - Freeze exact pixel height while navigating (children remount underneath)
 * - One absolute skeleton overlay (same paper background)
 * - Keep a rising min-height floor so dismiss never collapses the box
 */
export function WorkspacePendingSkeleton({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { pendingHref } = useNavigation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);
  const [floor, setFloor] = useState(560);

  const show =
    Boolean(pendingHref) &&
    !isLoginRoute(pathname) &&
    !isLoginRoute(pendingHref!);

  useLayoutEffect(() => {
    const node = wrapRef.current;
    if (!node) return;

    if (show) {
      const h = Math.max(node.getBoundingClientRect().height, 560);
      setLockedHeight(h);
      setFloor((prev) => Math.max(prev, h));
      return;
    }

    setLockedHeight(null);
    const h = Math.max(node.getBoundingClientRect().height, 560);
    setFloor((prev) => Math.max(prev, h));
  }, [show, pathname]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      style={{
        minHeight: floor,
        ...(lockedHeight != null ? { height: lockedHeight, overflow: "hidden" } : null),
      }}
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
