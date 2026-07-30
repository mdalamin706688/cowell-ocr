"use client";

import { useEffect, useState } from "react";

/** Root fallback — soft recover without trapping on 表示エラー. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [giveUp, setGiveUp] = useState(false);

  useEffect(() => {
    console.error("[cowell:global]", error);
    const soft = window.setTimeout(() => {
      try {
        reset();
      } catch {
        // ignore
      }
    }, 40);
    const hard = window.setTimeout(() => {
      setGiveUp(true);
    }, 2000);
    return () => {
      window.clearTimeout(soft);
      window.clearTimeout(hard);
    };
  }, [error, reset]);

  if (!giveUp) {
    return (
      <html lang="ja" suppressHydrationWarning>
        <body suppressHydrationWarning>
          <div style={{ minHeight: "100vh" }} />
        </body>
      </html>
    );
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
            一時的な問題が発生しました。ホームに戻ってください。
          </p>
          <div style={{ marginTop: "1.5rem" }}>
            <button type="button" onClick={() => window.location.assign("/dashboard/")}>
              ホームへ
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
