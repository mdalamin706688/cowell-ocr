"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { NavigationProvider } from "@/contexts/navigation-context";
import { NavigationProgress } from "@/components/motion/navigation-progress";
import { NavigationRouteSkeleton } from "@/components/motion/navigation-route-skeleton";

function isTranslateDomError(message: string, name: string): boolean {
  return (
    name === "NotFoundError" ||
    name === "DOMException" ||
    message.includes("removeChild") ||
    message.includes("insertBefore") ||
    message.includes("child of")
  );
}

function TranslationErrorGuard() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const msg = event.message ?? "";
      const name = (event.error as Error | null)?.name ?? "";
      if (isTranslateDomError(msg, name)) {
        event.preventDefault();
        window.location.reload();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const err = event.reason as Error | null;
      if (err && isTranslateDomError(err.message ?? "", err.name ?? "")) {
        event.preventDefault();
        window.location.reload();
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
      <TranslationErrorGuard />
      <NavigationProgress />
      <NavigationRouteSkeleton />
      {children}
    </NavigationProvider>
  );
}
