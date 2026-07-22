"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { useNavigation } from "@/contexts/navigation-context";
import { cn } from "@/lib/utils";

type TransitionLinkProps = ComponentProps<typeof Link>;

export function TransitionLink({
  href,
  onClick,
  prefetch = true,
  className,
  ...props
}: TransitionLinkProps) {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const hrefString = typeof href === "string" ? href : href.pathname ?? "";

  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn("transition-transform duration-200 active:scale-[0.98]", className)}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        startNavigation(hrefString);
      }}
      onMouseEnter={() => {
        if (hrefString) router.prefetch(hrefString);
      }}
      {...props}
    />
  );
}
