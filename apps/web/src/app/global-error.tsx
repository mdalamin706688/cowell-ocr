"use client";

import { useEffect } from "react";
import {
  isChunkLoadError,
  isDomMutationError,
  recoverFromChunkLoadError,
} from "@/lib/dom-mutation-error";

/** Root-level fallback — only used when the root layout itself fails. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    if (recoverFromChunkLoadError(error)) return;
    if (isDomMutationError(error)) {
      reset();
    }
  }, [error, reset]);

  if (isChunkLoadError(error) || isDomMutationError(error)) {
    return null;
  }

  return (
    <html lang="ja" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>表示エラーが発生しました</h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "#666" }}>
            一時的な問題が発生しました。再読み込みをお試しください。
          </p>
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
            <button type="button" onClick={() => window.location.reload()}>
              再読み込み
            </button>
            <button type="button" onClick={() => reset()}>
              再試行
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
