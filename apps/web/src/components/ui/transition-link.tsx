"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useNavigation } from "@/contexts/navigation-context";
import { cn } from "@/lib/utils";

function normalizePath(path: string): string {
  if (!path) return "/";
  return path.endsWith("/") ? path : `${path}/`;
}

type TransitionLinkProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  href: string;
  children?: ReactNode;
  /** Accepted for API compat — always soft-prefetched on hover */
  prefetch?: boolean;
};

/**
 * In-app navigation with ZERO <a href> document loads.
 * Critical for CloudFront static export + collapsed sidebar (no shell remount).
 */
export function TransitionLink({
  href,
  onClick,
  onMouseEnter,
  className,
  children,
  prefetch: _prefetch = true,
  ...props
}: TransitionLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { startNavigation } = useNavigation();
  const active = normalizePath(pathname) === normalizePath(href);

  return (
    <button
      type="button"
      {...props}
      aria-current={active ? "page" : undefined}
      className={cn(
        "cursor-pointer border-0 bg-transparent p-0 text-left appearance-none transition-opacity duration-150 active:opacity-80",
        className
      )}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        router.prefetch(href);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        if (active) return;
        startNavigation(href);
        router.push(href);
      }}
    >
      {children}
    </button>
  );
}
