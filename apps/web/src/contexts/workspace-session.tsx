"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SessionUser } from "@/lib/client-auth";
import { getShellSessionUser } from "@/lib/shell-session";

const WorkspaceSessionContext = createContext<SessionUser | null>(null);

export function WorkspaceSessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  return (
    <WorkspaceSessionContext.Provider value={user}>
      {children}
    </WorkspaceSessionContext.Provider>
  );
}

/**
 * Never throw during soft-nav remount races — that surfaces as 表示エラー.
 * Fall back to the tab-lifetime shell session cache instead.
 */
export function useWorkspaceSession(): SessionUser {
  const session = useContext(WorkspaceSessionContext);
  if (session) return session;
  const cached = getShellSessionUser();
  if (cached) return cached;
  return { email: "", name: "", groups: [] };
}
