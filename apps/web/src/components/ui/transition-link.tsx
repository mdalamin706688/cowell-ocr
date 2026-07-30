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
      className={cn("transition-opacity duration-150", className)}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        // Let the browser handle modified clicks (new tab, etc.) without SPA chrome.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        if (!hrefString) return;
        if (normalizePath(pathname) === normalizePath(hrefString)) return;
        startNavigation(hrefString);
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        if (hrefString) router.prefetch(hrefString);
      }}
    />
  );
}
