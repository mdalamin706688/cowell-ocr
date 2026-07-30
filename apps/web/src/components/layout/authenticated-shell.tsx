"use client";

import { useEffect, useState } from "react";
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

interface AuthenticatedShellProps {
  children: React.ReactNode;
}

export function AuthenticatedShell({ children }: AuthenticatedShellProps) {
  const router = useRouter();
  const cognito = isCognitoConfigured();
  const preview = isPreviewEnvironment() && !cognito;

  // Prefer cached session so soft navigations never flash the full shell skeleton.
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

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
        setUser(cached);
        setReady(true);
      }

      try {
        if (cognito) {
          const session = await getCognitoSessionUser();
          if (!session) {
            clearClientSession();
            if (!cancelled) router.replace("/login/");
            return;
          }
          if (!cancelled) {
            setClientSession(session);
            setUser(session);
            setReady(true);
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
            setUser(session);
            setReady(true);
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
          setUser(session);
          setReady(true);
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

  if (!ready || !user) {
    return <ShellSkeleton />;
  }

  return (
    <WorkspaceSessionProvider user={user}>
      <AppShell user={user}>{children}</AppShell>
    </WorkspaceSessionProvider>
  );
}
