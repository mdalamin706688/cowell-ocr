import { SkeletonBlock } from "@/components/layout/skeleton-primitives";

/**
 * First document-load authentication placeholder.
 *
 * Never render fake sidebar chrome here: on a static host the persisted
 * collapsed preference is client-only, and an expanded sidebar skeleton is a
 * misleading flash. Intra-workspace SPA navigation never reaches this state.
 */
export function ShellSkeleton() {
  return (
    <div className="paper-canvas flex min-h-screen items-center justify-center px-6" aria-busy>
      <div className="flex w-full max-w-xs flex-col items-center gap-5">
        <div className="forest-panel flex h-12 w-12 items-center justify-center rounded-xl">
          <div className="h-3 w-3 animate-pulse rounded-full bg-lumen-glow" />
        </div>
        <div className="w-full space-y-2">
          <SkeletonBlock className="mx-auto h-2 w-32 rounded-full" />
          <SkeletonBlock className="mx-auto h-2 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
