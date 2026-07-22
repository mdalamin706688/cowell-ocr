"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

interface NavigationContextValue {
  isNavigating: boolean;
  progress: number;
  startNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

const MIN_PROGRESS_MS = 180;

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const startedAt = useRef(0);
  const prevPath = useRef(pathname);

  const startNavigation = useCallback(() => {
    startedAt.current = Date.now();
    setIsNavigating(true);
    setProgress(18);
    requestAnimationFrame(() => setProgress(62));
  }, []);

  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;

    if (!isNavigating) {
      setIsNavigating(true);
      setProgress(62);
    }

    const elapsed = Date.now() - (startedAt.current || Date.now());
    const remaining = Math.max(0, MIN_PROGRESS_MS - elapsed);

    const finishTimer = window.setTimeout(() => {
      setProgress(100);
    }, remaining);

    const hideTimer = window.setTimeout(() => {
      setIsNavigating(false);
      setProgress(0);
    }, remaining + 320);

    return () => {
      window.clearTimeout(finishTimer);
      window.clearTimeout(hideTimer);
    };
  }, [pathname, isNavigating]);

  return (
    <NavigationContext.Provider value={{ isNavigating, progress, startNavigation }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    return {
      isNavigating: false,
      progress: 0,
      startNavigation: () => {},
    };
  }
  return ctx;
}
