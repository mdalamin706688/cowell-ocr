"use client";

/** Content is ready immediately — do not gate UI behind artificial skeleton delays. */
export function usePageReady(): boolean {
  return true;
}
