"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useNavigation } from "@/contexts/navigation-context";
import { versionedAppRoute } from "@/lib/route-version";
import { cn } from "@/lib/utils";

function normalizePath(path: string): string {
  if (!path) return "/";
  return path.endsWith("/") ? path : `${path}/`;
}

type SoftNavButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick"> & {
  href: string;
  children: ReactNode;
  onNavigate?: () => void;
};

/**
 * Workspace nav with ZERO <a href> fallback. Browser cannot hard-reload the
 * static HTML (which would paint expanded ShellSkeleton on CloudFront).
 */
export function SoftNavButton({
  href,
  className,
  children,
  onNavigate,
  onMouseEnter,
  ...props
}: SoftNavButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { startNavigation } = useNavigation();
  const active = normalizePath(pathname) === normalizePath(href);
  const route = versionedAppRoute(href);

  const go = () => {
    if (active) return;
    onNavigate?.();
    startNavigation(href);
    router.push(route);
  };

  return (
    <button
      type="button"
      {...props}
      aria-current={active ? "page" : undefined}
      className={cn(
        "cursor-pointer border-0 bg-transparent text-left appearance-none",
        className
      )}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        router.prefetch(route);
      }}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        go();
      }}
    >
      {children}
    </button>
  );
}
