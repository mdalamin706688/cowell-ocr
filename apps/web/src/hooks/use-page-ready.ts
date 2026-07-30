"use client";

import { useNavigation } from "@/contexts/navigation-context";

/**
 * Content is ready whenever the nav overlay is gone.
 * No extra delay after dismiss (that felt like a second jump).
 */
export function usePageReady(): boolean {
  const { pendingHref } = useNavigation();
  return !pendingHref;
}
