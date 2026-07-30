"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { normalizeRoutePath, useNavigation } from "@/contexts/navigation-context";
import { MIN_SKELETON_MS } from "@/lib/motion";

/**
 * Unlock content when the destination is mounted and the skeleton beat
 * (measured from click) has elapsed — overlaps CloudFront chunk download
 * so total time matches localhost.
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
    const stillPending =
      Boolean(pendingHref) &&
      normalizeRoutePath(pendingHref!) !== normalizeRoutePath(pathname);

    if (stillPending) {
      setReady(false);
      return;
    }

    const started = navStartedAt || Date.now();
    const reveal = () => {
      if (pathRef.current !== pathname) return;
      setReady(true);
    };

    const elapsed = Date.now() - started;
    const wait = Math.max(0, MIN_SKELETON_MS - elapsed);
    const timer = window.setTimeout(reveal, wait);
    return () => window.clearTimeout(timer);
  }, [pathname, pendingHref, navStartedAt]);

  return ready;
}
