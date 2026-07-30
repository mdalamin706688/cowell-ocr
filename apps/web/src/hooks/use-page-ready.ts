"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useNavigation } from "@/contexts/navigation-context";
import { MIN_SKELETON_MS } from "@/lib/motion";

/**
 * Page content unlocks after navigation settles + a short premium skeleton beat.
 * Same timing on localhost and CloudFront.
 */
export function usePageReady(): boolean {
  const pathname = usePathname();
  const { isNavigating } = useNavigation();
  const [ready, setReady] = useState(false);
  const pathRef = useRef(pathname);
  const readyAt = useRef(0);

  useEffect(() => {
    pathRef.current = pathname;
    setReady(false);
    readyAt.current = Date.now();
  }, [pathname]);

  useEffect(() => {
    if (isNavigating) return;

    const elapsed = Date.now() - readyAt.current;
    const wait = Math.max(0, MIN_SKELETON_MS - elapsed);

    const revealTimer = window.setTimeout(() => {
      if (pathRef.current === pathname) setReady(true);
    }, wait);

    return () => window.clearTimeout(revealTimer);
  }, [pathname, isNavigating]);

  return ready;
}
