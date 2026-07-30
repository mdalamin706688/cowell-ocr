"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  getSidebarCollapsedServerSnapshot,
  getSidebarCollapsedSnapshot,
  hydrateSidebarCollapsedFromStorage,
  setSidebarCollapsed,
  subscribeSidebarCollapsed,
  toggleSidebarCollapsed,
} from "@/lib/sidebar-collapse";

/** Collapsed sidebar preference shared across shell + skeleton (no remount flash). */
export function useSidebarCollapsed() {
  const collapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    getSidebarCollapsedSnapshot,
    getSidebarCollapsedServerSnapshot
  );

  useEffect(() => {
    hydrateSidebarCollapsedFromStorage();
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    setSidebarCollapsed(value);
  }, []);

  const toggleCollapsed = useCallback(() => {
    toggleSidebarCollapsed();
  }, []);

  return { collapsed, setCollapsed, toggleCollapsed };
}
