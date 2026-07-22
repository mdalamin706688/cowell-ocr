"use client";

import { usePathname } from "next/navigation";
import { RouteContentSkeleton } from "@/components/layout/content-skeleton";
import { SkeletonShell } from "@/components/layout/skeleton-shell";
import { useNavigation } from "@/contexts/navigation-context";

export default function WorkspaceLoading() {
  const pathname = usePathname();
  const { pendingHref } = useNavigation();
  const target = pendingHref ?? pathname;

  return (
    <SkeletonShell>
      <RouteContentSkeleton href={target} />
    </SkeletonShell>
  );
}
