"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ShellSkeleton } from "@/components/layout/shell-skeleton";
import { WorkspaceSessionProvider } from "@/contexts/workspace-session";
import { getCognitoSessionUser } from "@/lib/cognito-auth";
import { isCognitoConfigured } from "@/lib/cognito-config";
import {
  isPreviewEnvironment,
  peekClientSession,
  setClientSession,
  type SessionUser,
} from "@/lib/client-auth";

interface AuthenticatedShellProps {
  children: React.ReactNode;
}

export function AuthenticatedShell({ children }: AuthenticatedShellProps) {
  const router = useRouter();
  const cognito = isCognitoConfigured();
  const preview = isPreviewEnvironment() && !cognito;
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    router.prefetch("/dashboard/");
    router.prefetch("/survey/new/");
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      if (cognito) {
        const session = await getCognitoSessionUser();
        if (!session) {
          router.replace("/login/");
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
          router.replace("/login/");
          return;
        }
        if (!cancelled) {
          setUser(session);
          setReady(true);
        }
        return;
      }

      try {
        const res = await fetch("/api/auth/session", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) {
          router.replace("/login/");
          return;
        }
        const session = (await res.json()) as SessionUser;
        if (!cancelled) {
          setUser(session);
          setReady(true);
        }
      } catch {
        router.replace("/login/");
      }
    }

    if (!ready) void loadSession();
    return () => {
      cancelled = true;
    };
  }, [cognito, preview, ready, router]);

  // Hydrate session synchronously on the client right after login navigation
  useEffect(() => {
    if (cognito || !preview || ready) return;
    const session = peekClientSession();
    if (!session) return;
    setUser(session);
    setReady(true);
  }, [cognito, preview, ready]);

  if (!ready || !user) {
    return <ShellSkeleton />;
  }

  return (
    <WorkspaceSessionProvider user={user}>
      <AppShell user={user}>{children}</AppShell>
    </WorkspaceSessionProvider>
  );
}
