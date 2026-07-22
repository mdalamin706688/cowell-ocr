import { ContentSkeleton } from "@/components/layout/content-skeleton";
import { SkeletonShell } from "@/components/layout/skeleton-shell";

export default function DashboardLoading() {
  return (
    <SkeletonShell>
      <ContentSkeleton />
    </SkeletonShell>
  );
}
