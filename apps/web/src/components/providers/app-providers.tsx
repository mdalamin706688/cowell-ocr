"use client";

import type { ReactNode } from "react";
import { NavigationProvider } from "@/contexts/navigation-context";
import { NavigationProgress } from "@/components/motion/navigation-progress";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <NavigationProvider>
      <NavigationProgress />
      {children}
    </NavigationProvider>
  );
}
