"use client";

/**
 * Keep previous page painted while the next static chunk loads (CloudFront).
 * Replacing with a skeleton here caused the CloudFront-only jump; local never
 * hit this path long enough to notice. Page-level StaggerReveal still owns skeletons.
 */
export function WorkspacePendingSkeleton({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
