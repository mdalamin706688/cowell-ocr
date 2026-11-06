"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useNavigation } from "@/contexts/navigation-context";
import { MIN_SKELETON_MS } from "@/lib/motion";

/**
 * Content-area ready gate only. Shell stays mounted independently.
 * Short beat while soft-nav settles — never tied to shell remount.
 */
export function usePageReady(): boolean {
  const pathname = usePathname();
  const { isNavigating, pendingHref } = useNavigation();
  const [ready, setReady] = useState(() => !pendingHref && !isNavigating);
  const pathRef = useRef(pathname);

  useEffect(() => {
    if (pathRef.current === pathname) return;
    pathRef.current = pathname;
    setReady(false);
  }, [pathname]);

  useEffect(() => {
    if (isNavigating || pendingHref) return;

    const revealTimer = window.setTimeout(() => {
      if (pathRef.current === pathname) setReady(true);
    }, Math.min(MIN_SKELETON_MS, 280));

    return () => window.clearTimeout(revealTimer);
  }, [pathname, isNavigating, pendingHref]);

  return ready;
}
