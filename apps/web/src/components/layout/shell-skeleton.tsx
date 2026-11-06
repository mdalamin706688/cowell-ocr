import { CMonogram } from "@/components/brand/logo";
import { SkeletonBlock } from "@/components/layout/skeleton-primitives";

/**
 * First document-load authentication placeholder.
 *
 * Uses inline SVG (not next/image) so SSR and client HTML match exactly.
 * Never render fake sidebar chrome here: on a static host the persisted
 * collapsed preference is client-only, and an expanded sidebar skeleton is a
 * misleading flash. Intra-workspace SPA navigation never reaches this state.
 */
export function ShellSkeleton() {
  return (
    <div className="paper-canvas flex min-h-screen items-center justify-center px-6" aria-busy>
      <div className="flex w-full max-w-xs flex-col items-center gap-5">
        <CMonogram size={48} />
        <div className="w-full space-y-2">
          <SkeletonBlock className="mx-auto h-2 w-32 rounded-full" />
          <SkeletonBlock className="mx-auto h-2 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
