import { SurveyPageSkeleton } from "@/components/layout/content-skeleton";
import { SkeletonShell } from "@/components/layout/skeleton-shell";

export default function SurveyLoading() {
  return (
    <SkeletonShell>
      <SurveyPageSkeleton />
    </SkeletonShell>
  );
}
