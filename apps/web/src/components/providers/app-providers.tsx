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

/**
 * Swallow translate / chunk races. Never hard-reload — remounts shell on CloudFront.
 */
function DomMutationErrorGuard() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const msg = event.message ?? "";
      const name = (event.error as Error | null)?.name ?? "";
      if (
        isDomMutationErrorEvent(msg, name) ||
        isDomMutationError(event.error) ||
        isChunkLoadError(event.error) ||
        isChunkLoadError({ name, message: msg })
      ) {
        event.preventDefault();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isDomMutationError(event.reason) || isChunkLoadError(event.reason)) {
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
