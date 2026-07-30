"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useNavigation } from "@/contexts/navigation-context";
import { MIN_SKELETON_MS } from "@/lib/motion";

/** Unlocks content reveal after navigation ends + minimum skeleton display */
export function usePageReady(): boolean {
  const pathname = usePathname();
  const { isNavigating } = useNavigation();
  const [ready, setReady] = useState(false);
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
    setReady(false);
  }, [pathname]);

  useEffect(() => {
    if (isNavigating) return;

    const revealTimer = window.setTimeout(() => {
      if (pathRef.current === pathname) {
        setReady(true);
      }
    }, MIN_SKELETON_MS);

    return () => window.clearTimeout(revealTimer);
  }, [pathname, isNavigating]);

  return ready;
}
