"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useNavigation } from "@/contexts/navigation-context";
import { PAGE_REVEAL_DELAY_MS } from "@/lib/motion";

/** Unlocks stagger reveal after route slide finishes — avoids double skeleton/content flash */
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

    const timer = window.setTimeout(() => {
      if (pathRef.current === pathname) {
        setReady(true);
      }
    }, PAGE_REVEAL_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [pathname, isNavigating]);

  return ready;
}
