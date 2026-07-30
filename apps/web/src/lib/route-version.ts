const BUILD_ID = process.env.NEXT_PUBLIC_APP_BUILD_ID ?? "dev";

/**
 * Version Next static-export route payload requests.
 *
 * Older CloudFront deployments cached unhashed `index.txt` route payloads as
 * immutable. A build query immediately bypasses those browser cache entries
 * while preserving a normal SPA navigation.
 */
export function versionedAppRoute(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;

  const [pathAndQuery, hash = ""] = href.split("#", 2);
  const separator = pathAndQuery.includes("?") ? "&" : "?";
  const versioned = `${pathAndQuery}${separator}v=${encodeURIComponent(BUILD_ID)}`;
  return hash ? `${versioned}#${hash}` : versioned;
}
