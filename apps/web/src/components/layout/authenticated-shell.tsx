"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ShellSkeleton } from "@/components/layout/shell-skeleton";
import { WorkspaceSessionProvider } from "@/contexts/workspace-session";
import {
  isPreviewEnvironment,
  peekClientSession,
  type SessionUser,
} from "@/lib/client-auth";

interface AuthenticatedShellProps {
  children: React.ReactNode;
}

export function AuthenticatedShell({ children }: AuthenticatedShellProps) {
  const router = useRouter();
  const preview = isPreviewEnvironment();
  const [user, setUser] = useState<SessionUser | null>(() =>
    preview ? peekClientSession() : null
  );
  const [ready, setReady] = useState(() => preview && !!peekClientSession());

  useEffect(() => {
    router.prefetch("/dashboard/");
    router.prefetch("/survey/new/");
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
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
  }, [preview, ready, router]);

  if (!ready || !user) {
    return <ShellSkeleton />;
  }

  return (
    <WorkspaceSessionProvider user={user}>
      <AppShell user={user}>{children}</AppShell>
    </WorkspaceSessionProvider>
  );
}
