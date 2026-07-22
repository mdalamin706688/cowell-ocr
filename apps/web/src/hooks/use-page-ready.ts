"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PAGE_STAGGER_DELAY_MS } from "@/lib/motion";

/** Delays content stagger until the route slide has started */
export function usePageReady(): boolean {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const timer = window.setTimeout(() => setReady(true), PAGE_STAGGER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return ready;
}
