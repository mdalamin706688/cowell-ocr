"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { NavigationProvider } from "@/contexts/navigation-context";
import { NavigationProgress } from "@/components/motion/navigation-progress";
import { NavigationRouteSkeleton } from "@/components/motion/navigation-route-skeleton";
import { isDomMutationError, isDomMutationErrorEvent } from "@/lib/dom-mutation-error";

/**
 * Swallow translate / Framer DOM races. Never hard-reload — that destroys SPA
 * state and remounts the sidebar on CloudFront static hosts.
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
  return (
    <NavigationProvider>
      <DomMutationErrorGuard />
      <NavigationProgress />
      <NavigationRouteSkeleton />
      {children}
    </NavigationProvider>
  );
}
