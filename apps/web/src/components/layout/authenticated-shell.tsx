"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceSessionProvider } from "@/contexts/workspace-session";
import {
  isPreviewEnvironment,
  readClientSession,
  type SessionUser,
} from "@/lib/client-auth";

interface AuthenticatedShellProps {
  children: React.ReactNode;
}

export function AuthenticatedShell({ children }: AuthenticatedShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      if (isPreviewEnvironment()) {
        const session = readClientSession();
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

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center paper-canvas">
        <Loader2 className="h-7 w-7 animate-spin text-lumen" aria-label="Loading" />
      </div>
    );
  }

  return (
    <WorkspaceSessionProvider user={user}>
      <AppShell user={user}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </AppShell>
    </WorkspaceSessionProvider>
  );
}
