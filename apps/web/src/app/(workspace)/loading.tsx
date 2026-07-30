"use client";

/**
 * Soft navigations should keep the previous view until the next page is ready.
 * A Suspense loading UI here caused a skeleton “jump” on CloudFront (chunk latency)
 * that localhost rarely shows.
 */
export default function WorkspaceLoading() {
  return null;
}
