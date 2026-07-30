/** Workspace routes to warm for static / CloudFront soft nav */

export const WORKSPACE_PREFETCH_ROUTES = [
  "/dashboard/",
  "/users/",
  "/survey/new/",
] as const;

type PrefetchRouter = { prefetch: (href: string) => void };

/** Prefetch Next route manifests + warm HTML in the HTTP cache (CloudFront). */
export function prefetchWorkspaceRoutes(router: PrefetchRouter): void {
  for (const route of WORKSPACE_PREFETCH_ROUTES) {
    try {
      router.prefetch(route);
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      void fetch(route, {
        credentials: "same-origin",
        cache: "force-cache",
      }).catch(() => {});
    }
  }
}
