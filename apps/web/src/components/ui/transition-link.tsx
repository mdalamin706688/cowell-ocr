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

  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn("transition-transform active:scale-[0.98]", className)}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        startNavigation();
      }}
      onMouseEnter={() => {
        if (typeof href === "string") router.prefetch(href);
      }}
      {...props}
    />
  );
}
