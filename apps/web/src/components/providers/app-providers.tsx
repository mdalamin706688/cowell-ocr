"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { NavigationProvider } from "@/contexts/navigation-context";
import { NavigationProgress } from "@/components/motion/navigation-progress";
import {
  isChunkLoadError,
  isDomMutationError,
  isDomMutationErrorEvent,
} from "@/lib/dom-mutation-error";

const CHUNK_RELOAD_KEY = "cowell_chunk_reload_path";

function recoverInitialChunkLoad(): void {
  try {
    const path = window.location.href;
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === path) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, path);
    window.location.reload();
  } catch {
    // Storage can be blocked; leave the global error boundary available.
  }
}

/**
 * Ignore browser-translation DOM races. A missing/stale chunk on a static host
 * gets one controlled reload so server-rendered skeleton HTML cannot persist.
 */
function DomMutationErrorGuard() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const msg = event.message ?? "";
      const name = (event.error as Error | null)?.name ?? "";
      const chunkError =
        isChunkLoadError(event.error) || isChunkLoadError({ name, message: msg });
      if (chunkError) {
        event.preventDefault();
        recoverInitialChunkLoad();
        return;
      }
      if (
        isDomMutationErrorEvent(msg, name) ||
        isDomMutationError(event.error)
      ) {
        event.preventDefault();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        event.preventDefault();
        recoverInitialChunkLoad();
        return;
      }
      if (isDomMutationError(event.reason)) {
        event.preventDefault();
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      sessionStorage.removeItem("cowell_soft_error_resets");
      const clearChunkDebt = window.setTimeout(() => {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      }, 10_000);
      return () => window.clearTimeout(clearChunkDebt);
    } catch {
      // ignore
    }
  }, []);

  return (
    <NavigationProvider>
      <DomMutationErrorGuard />
      <NavigationProgress />
      {children}
    </NavigationProvider>
  );
}
