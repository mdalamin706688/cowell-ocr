"use client";

import { usePathname } from "next/navigation";
import { RouteContentSkeleton } from "@/components/layout/content-skeleton";
import { useNavigation } from "@/contexts/navigation-context";

/** Suspense fallback — content-area only; sidebar stays via layout. */
export default function WorkspaceLoading() {
  const pathname = usePathname();
  const { pendingHref } = useNavigation();
  return <RouteContentSkeleton href={pendingHref ?? pathname} />;
}
