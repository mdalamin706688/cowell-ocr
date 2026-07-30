"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { normalizeRoutePath, useNavigation } from "@/contexts/navigation-context";
import { MIN_SKELETON_MS } from "@/lib/motion";

/**
 * Content unlocks when destination is up and the click→skeleton beat is done.
 * Synced with WorkspacePendingSkeleton dismiss (one skeleton only).
 */
export function usePageReady(): boolean {
  const pathname = usePathname();
  const { pendingHref, navStartedAt } = useNavigation();
  const [ready, setReady] = useState(false);
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
    setReady(false);
  }, [pathname]);

  useEffect(() => {
    // Still downloading destination chunk
    if (
      pendingHref &&
      normalizeRoutePath(pendingHref) !== normalizeRoutePath(pathname)
    ) {
      setReady(false);
      return;
    }

    // Overlay skeleton still up for the beat (pendingHref matches pathname)
    if (pendingHref) {
      setReady(false);
      return;
    }

    // Cold load / no soft-nav — show content immediately
    if (!navStartedAt) {
      setReady(true);
      return;
    }

    const elapsed = Date.now() - navStartedAt;
    const wait = Math.max(0, MIN_SKELETON_MS - elapsed);
    const timer = window.setTimeout(() => {
      if (pathRef.current === pathname) setReady(true);
    }, wait);

    return () => window.clearTimeout(timer);
  }, [pathname, pendingHref, navStartedAt]);

  return ready;
}
