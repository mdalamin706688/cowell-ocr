"use client";

/** Workspace page slot — layout (AppShell) stays mounted; only page body swaps. */
export default function WorkspaceTemplate({ children }: { children: React.ReactNode }) {
  return <div className="w-full">{children}</div>;
}
