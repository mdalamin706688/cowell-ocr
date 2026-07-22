"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SessionUser } from "@/lib/client-auth";

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

export function useWorkspaceSession(): SessionUser {
  const session = useContext(WorkspaceSessionContext);
  if (!session) {
    throw new Error("useWorkspaceSession must be used within WorkspaceSessionProvider");
  }
  return session;
}
