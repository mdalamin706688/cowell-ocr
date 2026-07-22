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
import { PAGE_TRANSITION_MS } from "@/lib/motion";

interface NavigationContextValue {
  isNavigating: boolean;
  progress: number;
  direction: number;
  pendingHref: string | null;
  startNavigation: (targetHref?: string) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

const ROUTE_ORDER = ["/login/", "/dashboard/", "/survey/new/"];

function routeIndex(path: string): number {
  const normalized = path.endsWith("/") ? path : `${path}/`;
  const idx = ROUTE_ORDER.indexOf(normalized);
  return idx === -1 ? ROUTE_ORDER.length : idx;
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [direction, setDirection] = useState(1);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const startedAt = useRef(0);
  const prevPath = useRef(pathname);

  const startNavigation = useCallback(
    (targetHref?: string) => {
      if (targetHref) {
        setPendingHref(targetHref);
        const from = routeIndex(pathname);
        const to = routeIndex(targetHref);
        setDirection(to >= from ? 1 : -1);
      }
      startedAt.current = Date.now();
      setIsNavigating(true);
      setProgress(12);
      requestAnimationFrame(() => setProgress(58));
    },
    [pathname]
  );

  useEffect(() => {
    if (prevPath.current === pathname) return;

    const from = routeIndex(prevPath.current);
    const to = routeIndex(pathname);
    setDirection(to >= from ? 1 : -1);
    prevPath.current = pathname;

    if (!isNavigating) {
      setIsNavigating(true);
      setProgress(58);
    }

    const elapsed = Date.now() - (startedAt.current || Date.now());
    const remaining = Math.max(0, PAGE_TRANSITION_MS - elapsed);

    const finishTimer = window.setTimeout(() => {
      setProgress(100);
    }, remaining);

    const hideTimer = window.setTimeout(() => {
      setIsNavigating(false);
      setProgress(0);
      setPendingHref(null);
    }, remaining + 280);

    return () => {
      window.clearTimeout(finishTimer);
      window.clearTimeout(hideTimer);
    };
  }, [pathname, isNavigating]);

  return (
    <NavigationContext.Provider
      value={{ isNavigating, progress, direction, pendingHref, startNavigation }}
    >
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
      direction: 1,
      pendingHref: null,
      startNavigation: (_targetHref?: string) => {},
    };
  }
  return ctx;
}
