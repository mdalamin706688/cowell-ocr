"use client";

/**
 * Workspace page slot — no Framer remounts.
 * Framer key={pathname} unmounts caused 表示エラー on CloudFront / translate.
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
