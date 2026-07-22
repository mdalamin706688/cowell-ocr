"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useNavigation } from "@/contexts/navigation-context";
import { MIN_SKELETON_MS, PAGE_REVEAL_DELAY_MS } from "@/lib/motion";

/** Unlocks stagger reveal after route slide + minimum skeleton display time */
export function usePageReady(): boolean {
  const pathname = usePathname();
  const { isNavigating } = useNavigation();
  const [ready, setReady] = useState(false);
  const pathRef = useRef(pathname);
  const skeletonAt = useRef(Date.now());

  useEffect(() => {
    pathRef.current = pathname;
    skeletonAt.current = Date.now();
    setReady(false);
  }, [pathname]);

  useEffect(() => {
    if (isNavigating) return;

    let revealTimer: number | undefined;

    const timer = window.setTimeout(() => {
      if (pathRef.current !== pathname) return;

      const elapsed = Date.now() - skeletonAt.current;
      const minRemaining = Math.max(0, MIN_SKELETON_MS - elapsed);

      revealTimer = window.setTimeout(() => {
        if (pathRef.current === pathname) {
          setReady(true);
        }
      }, minRemaining);
    }, PAGE_REVEAL_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      if (revealTimer) window.clearTimeout(revealTimer);
    };
  }, [pathname, isNavigating]);

  return ready;
}
