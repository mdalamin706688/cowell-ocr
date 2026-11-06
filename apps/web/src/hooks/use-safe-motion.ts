"use client";

import { useReducedMotion } from "framer-motion";
import { useBrowserTranslated } from "@/hooks/use-browser-translated";

/** True when Framer Motion exit/layout animations are safe to run */
export function useSafeMotion(): boolean {
  const reduced = useReducedMotion();
  const translated = useBrowserTranslated();
  return !reduced && !translated;
}
