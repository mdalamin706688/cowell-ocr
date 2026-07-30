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
import { MIN_SKELETON_MS, PAGE_TRANSITION_MS } from "@/lib/motion";

interface NavigationContextValue {
  isNavigating: boolean;
  progress: number;
  direction: number;
  pendingHref: string | null;
  navStartedAt: number;
  startNavigation: (targetHref?: string) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

const ROUTE_ORDER = ["/login/", "/dashboard/", "/users/", "/survey/new/"];

export function normalizeRoutePath(path: string): string {
  if (!path) return "/";
  return path.endsWith("/") ? path : `${path}/`;
}

function routeIndex(path: string): number {
  const idx = ROUTE_ORDER.indexOf(normalizeRoutePath(path));
  return idx === -1 ? ROUTE_ORDER.length : idx;
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [direction, setDirection] = useState(1);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [navStartedAt, setNavStartedAt] = useState(0);
  const startedAt = useRef(0);
  const prevPath = useRef(pathname);

  const startNavigation = useCallback(
    (targetHref?: string) => {
      if (targetHref) {
        if (normalizeRoutePath(targetHref) === normalizeRoutePath(pathname)) return;
        setPendingHref(targetHref);
        setDirection(routeIndex(targetHref) >= routeIndex(pathname) ? 1 : -1);
      }
      const now = Date.now();
      startedAt.current = now;
      setNavStartedAt(now);
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

    if (!startedAt.current) {
      const now = Date.now();
      startedAt.current = now;
      setNavStartedAt(now);
    }

    setIsNavigating(true);
    setProgress(58);

    const elapsed = Date.now() - (startedAt.current || Date.now());
    const remaining = Math.max(0, PAGE_TRANSITION_MS - elapsed);

    const finishTimer = window.setTimeout(() => setProgress(100), remaining);
    const hideTimer = window.setTimeout(() => {
      setIsNavigating(false);
      setProgress(0);
      startedAt.current = 0;
    }, remaining + 80);

    return () => {
      window.clearTimeout(finishTimer);
      window.clearTimeout(hideTimer);
    };
  }, [pathname]);

  // Keep a single route skeleton until the beat ends (no second page skeleton).
  useEffect(() => {
    if (!pendingHref) return;
    if (normalizeRoutePath(pathname) !== normalizeRoutePath(pendingHref)) return;

    const elapsed = Date.now() - (startedAt.current || Date.now());
    const wait = Math.max(0, MIN_SKELETON_MS - elapsed);
    const timer = window.setTimeout(() => setPendingHref(null), wait);
    return () => window.clearTimeout(timer);
  }, [pathname, pendingHref]);

  return (
    <NavigationContext.Provider
      value={{ isNavigating, progress, direction, pendingHref, navStartedAt, startNavigation }}
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
      navStartedAt: 0,
      startNavigation: (_targetHref?: string) => {},
    };
  }
  return ctx;
}
