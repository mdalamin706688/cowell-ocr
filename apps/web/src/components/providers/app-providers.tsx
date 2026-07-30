"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { NavigationProvider } from "@/contexts/navigation-context";
import { NavigationProgress } from "@/components/motion/navigation-progress";
import { NavigationRouteSkeleton } from "@/components/motion/navigation-route-skeleton";
import {
  isDomMutationError,
  isDomMutationErrorEvent,
} from "@/lib/dom-mutation-error";

/**
 * Swallow translate / Framer DOM races. Never hard-reload — that remounts the
 * workspace shell on CloudFront and looks like a full page refresh after skeleton.
 */
function DomMutationErrorGuard() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const msg = event.message ?? "";
      const name = (event.error as Error | null)?.name ?? "";
      if (isDomMutationErrorEvent(msg, name) || isDomMutationError(event.error)) {
        event.preventDefault();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
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
    } catch {
      // ignore
    }
  }, []);

  return (
    <NavigationProvider>
      <DomMutationErrorGuard />
      <NavigationProgress />
      <NavigationRouteSkeleton />
      {children}
    </NavigationProvider>
  );
}
