/** Workspace routes to warm for static / CloudFront soft nav */

import { versionedAppRoute } from "@/lib/route-version";

export const WORKSPACE_PREFETCH_ROUTES = [
  "/dashboard/",
  "/users/",
  "/survey/new/",
] as const;

type PrefetchRouter = { prefetch: (href: string) => void };

/** Prefetch Next route manifests + warm HTML in the HTTP cache (CloudFront). */
export function prefetchWorkspaceRoutes(router: PrefetchRouter): void {
  for (const route of WORKSPACE_PREFETCH_ROUTES) {
    const versionedRoute = versionedAppRoute(route);
    try {
      router.prefetch(versionedRoute);
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      void fetch(versionedRoute, {
        credentials: "same-origin",
        cache: "no-store",
      }).catch(() => {});
    }
  }
}
