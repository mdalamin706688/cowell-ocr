"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  isChunkLoadError,
  isDomMutationError,
  recoverFromChunkLoadError,
} from "@/lib/dom-mutation-error";

/** Route-level error UI — must not render <html>/<body> (nested inside root layout). */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    if (recoverFromChunkLoadError(error)) return;
    // Soft recover — full reload remounts the workspace shell on static hosts.
    if (isDomMutationError(error)) {
      reset();
    }
  }, [error, reset]);

  if (isChunkLoadError(error) || isDomMutationError(error)) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-xl font-semibold">表示エラーが発生しました</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        一時的な問題が発生しました。再読み込みをお試しください。
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={() => window.location.reload()}>
          再読み込み
        </Button>
        <Button type="button" variant="outline" onClick={() => reset()}>
          再試行
        </Button>
      </div>
    </div>
  );
}
