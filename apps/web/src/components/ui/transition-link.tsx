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
 * Soft SPA navigation. Capture-phase preventDefault so Next/browser never
 * follows the href on static hosts (full document load → shell skeleton flash).
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

  const softNavigate = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return false;
    }
    if (!hrefString) return false;
    event.preventDefault();
    event.stopPropagation();
    if (normalizePath(pathname) === normalizePath(hrefString)) return true;
    startNavigation(hrefString);
    router.push(hrefString);
    return true;
  };

  return (
    <Link
      href={href}
      prefetch={prefetch}
      scroll={false}
      {...props}
      className={cn("transition-opacity duration-150 active:opacity-80", className)}
      onClickCapture={(event) => {
        softNavigate(event);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        softNavigate(event);
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        if (hrefString) router.prefetch(hrefString);
      }}
    />
  );
}
