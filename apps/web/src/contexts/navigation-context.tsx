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
  const startedAt = useRef(0);
  const prevPath = useRef(pathname);
  const navigatingRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) window.clearTimeout(timer);
    timersRef.current = [];
  }, []);

  const finishNavigation = useCallback(() => {
    clearTimers();
    navigatingRef.current = false;
    setIsNavigating(false);
    setProgress(0);
    setPendingHref(null);
    startedAt.current = 0;
  }, [clearTimers]);

  const startNavigation = useCallback(
    (targetHref?: string) => {
      if (targetHref) {
        if (normalizeRoutePath(targetHref) === normalizeRoutePath(pathname)) return;
        setPendingHref(targetHref);
        setDirection(routeIndex(targetHref) >= routeIndex(pathname) ? 1 : -1);
      }
      clearTimers();
      startedAt.current = Date.now();
      navigatingRef.current = true;
      setIsNavigating(true);
      setProgress(12);
      requestAnimationFrame(() => setProgress(58));

      // Router failures must never strand all page content behind a skeleton.
      timersRef.current = [
        window.setTimeout(finishNavigation, 5_000),
      ];
    },
    [clearTimers, finishNavigation, pathname]
  );

  useEffect(() => {
    if (prevPath.current === pathname) return;

    clearTimers();
    const from = routeIndex(prevPath.current);
    const to = routeIndex(pathname);
    setDirection(to >= from ? 1 : -1);
    prevPath.current = pathname;

    // Clear sticky soft-error debt so 表示エラー cannot lock the session.
    try {
      sessionStorage.removeItem("cowell_soft_error_resets");
    } catch {
      // ignore
    }

    if (!navigatingRef.current) {
      navigatingRef.current = true;
      setIsNavigating(true);
      setProgress(58);
    }

    const elapsed = Date.now() - (startedAt.current || Date.now());
    const remaining = Math.max(0, PAGE_TRANSITION_MS - elapsed);

    const finishTimer = window.setTimeout(() => {
      setProgress(100);
    }, remaining);

    const hideTimer = window.setTimeout(() => {
      finishNavigation();
    }, remaining + 280);

    timersRef.current = [finishTimer, hideTimer];
  }, [clearTimers, finishNavigation, pathname]);

  useEffect(() => () => clearTimers(), [clearTimers]);

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
