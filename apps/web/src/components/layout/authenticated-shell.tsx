"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ShellSkeleton } from "@/components/layout/shell-skeleton";
import { WorkspaceSessionProvider } from "@/contexts/workspace-session";
import { getCognitoSessionUser } from "@/lib/cognito-auth";
import { isCognitoConfigured } from "@/lib/cognito-config";
import {
  clearClientSession,
  isPreviewEnvironment,
  peekClientSession,
  setClientSession,
  type SessionUser,
} from "@/lib/client-auth";
import { prefetchWorkspaceRoutes } from "@/lib/prefetch-workspace";
import {
  clearShellSessionUser,
  getShellSessionUser,
  isShellLocked,
  setShellSessionUser,
} from "@/lib/shell-session";

interface AuthenticatedShellProps {
  children: React.ReactNode;
}

/**
 * Complete workspace SPA shell:
 * - AppShell mounts once per tab after auth
 * - Soft-nav never swaps shell for ShellSkeleton
 * - Collapse state lives on <html>, independent of route
 */
export function AuthenticatedShell({ children }: AuthenticatedShellProps) {
  const router = useRouter();
  const cognito = isCognitoConfigured();
  const preview = isPreviewEnvironment() && !cognito;
  const lastUser = useRef<SessionUser | null>(getShellSessionUser());

  const [user, setUser] = useState<SessionUser | null>(() => getShellSessionUser());

  useLayoutEffect(() => {
    const cached = getShellSessionUser();
    if (!cached) return;
    setShellSessionUser(cached);
    lastUser.current = cached;
    setUser(cached);
  }, []);

  useEffect(() => {
    prefetchWorkspaceRoutes(router);
    const warm = window.setTimeout(() => prefetchWorkspaceRoutes(router), 800);
    const warm2 = window.setTimeout(() => prefetchWorkspaceRoutes(router), 2500);
    return () => {
      window.clearTimeout(warm);
      window.clearTimeout(warm2);
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const cached = peekClientSession();
      if (cached && !cancelled) {
        setShellSessionUser(cached);
        lastUser.current = cached;
        setUser(cached);
      }

      try {
        if (cognito) {
          const session = await getCognitoSessionUser();
          if (!session) {
            clearClientSession();
            clearShellSessionUser();
            lastUser.current = null;
            if (!cancelled) router.replace("/login/");
            return;
          }
          if (!cancelled) {
            setClientSession(session);
            setShellSessionUser(session);
            lastUser.current = session;
            setUser(session);
          }
          return;
        }

        if (preview) {
          const session = peekClientSession();
          if (!session) {
            if (!cancelled) router.replace("/login/");
            return;
          }
          if (!cancelled) {
            setShellSessionUser(session);
            lastUser.current = session;
            setUser(session);
          }
          return;
        }

        const res = await fetch("/api/auth/session", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) router.replace("/login/");
          return;
        }
        const session = (await res.json()) as SessionUser;
        if (!cancelled) {
          setClientSession(session);
          setShellSessionUser(session);
          lastUser.current = session;
          setUser(session);
        }
      } catch {
        if (!cancelled && !peekClientSession() && !isShellLocked()) {
          router.replace("/login/");
        }
      }
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [cognito, preview, router]);

  // Once locked, keep painting the live shell even if React state flickers.
  const sessionUser = user ?? lastUser.current ?? getShellSessionUser();
  if (!sessionUser) {
    return <ShellSkeleton />;
  }

  return (
    <WorkspaceSessionProvider user={sessionUser}>
      <AppShell user={sessionUser}>{children}</AppShell>
    </WorkspaceSessionProvider>
  );
}
