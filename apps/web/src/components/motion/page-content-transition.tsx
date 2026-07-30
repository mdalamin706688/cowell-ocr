"use client";

/**
 * Workspace polish lives in StaggerReveal (skeleton ↔ content).
 * Avoid remount transforms here — they caused soft-nav jumps.
 */
export function PageContentTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "workspace" | "auth";
}) {
  return <div className={className}>{children}</div>;
}
