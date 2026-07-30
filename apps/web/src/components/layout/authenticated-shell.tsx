"use client";

import { useEffect, useLayoutEffect, useState } from "react";
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
  setShellSessionUser,
} from "@/lib/shell-session";

interface AuthenticatedShellProps {
  children: React.ReactNode;
}

/**
 * AppShell stays mounted for the tab lifetime. ShellSkeleton only on first
 * unauthenticated paint — never mid soft-nav (that felt like a full reload).
 */
export function AuthenticatedShell({ children }: AuthenticatedShellProps) {
  const router = useRouter();
  const cognito = isCognitoConfigured();
  const preview = isPreviewEnvironment() && !cognito;

  const [user, setUser] = useState<SessionUser | null>(() => getShellSessionUser());

  useLayoutEffect(() => {
    const cached = getShellSessionUser();
    if (!cached) return;
    setShellSessionUser(cached);
    setUser(cached);
  }, []);

  useEffect(() => {
    prefetchWorkspaceRoutes(router);
    const warm = window.setTimeout(() => prefetchWorkspaceRoutes(router), 1200);
    return () => window.clearTimeout(warm);
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const cached = peekClientSession();
      if (cached && !cancelled) {
        setShellSessionUser(cached);
        setUser(cached);
      }

      try {
        if (cognito) {
          const session = await getCognitoSessionUser();
          if (!session) {
            clearClientSession();
            clearShellSessionUser();
            if (!cancelled) router.replace("/login/");
            return;
          }
          if (!cancelled) {
            setClientSession(session);
            setShellSessionUser(session);
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
          setUser(session);
        }
      } catch {
        if (!cancelled && !peekClientSession()) {
          router.replace("/login/");
        }
      }
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [cognito, preview, router]);

  const sessionUser = user ?? getShellSessionUser();
  if (!sessionUser) {
    return <ShellSkeleton />;
  }

  return (
    <WorkspaceSessionProvider user={sessionUser}>
      <AppShell user={sessionUser}>{children}</AppShell>
    </WorkspaceSessionProvider>
  );
}
