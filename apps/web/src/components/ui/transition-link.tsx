"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { useNavigation } from "@/contexts/navigation-context";
import { cn } from "@/lib/utils";

type TransitionLinkProps = ComponentProps<typeof Link>;

function normalizePath(path: string): string {
  if (!path) return "/";
  return path.endsWith("/") ? path : `${path}/`;
}

/**
 * Force client soft-nav. Letting the browser follow <a href> on static/CloudFront
 * remounts AuthenticatedShell → ShellSkeleton + full page refresh (worse when
 * the sidebar is collapsed).
 */
export function TransitionLink({
  href,
  onClick,
  onMouseEnter,
  prefetch = true,
  className,
  ...props
}: TransitionLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { startNavigation } = useNavigation();
  const hrefString = typeof href === "string" ? href : href.pathname ?? "";

  return (
    <Link
      href={href}
      prefetch={prefetch}
      scroll={false}
      {...props}
      className={cn("transition-opacity duration-150 active:opacity-80", className)}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        if (!hrefString) return;
        if (normalizePath(pathname) === normalizePath(hrefString)) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        startNavigation(hrefString);
        router.push(hrefString);
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        if (hrefString) router.prefetch(hrefString);
      }}
    />
  );
}
