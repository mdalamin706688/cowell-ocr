"use client";

import { useEffect, useState } from "react";

const RESET_KEY = "cowell_soft_error_resets";

function readResetCount(key: string): number {
  try {
    const map = JSON.parse(sessionStorage.getItem(RESET_KEY) || "{}") as Record<string, number>;
    return map[key] || 0;
  } catch {
    return 0;
  }
}

function bumpResetCount(key: string): number {
  try {
    const map = JSON.parse(sessionStorage.getItem(RESET_KEY) || "{}") as Record<string, number>;
    const next = (map[key] || 0) + 1;
    map[key] = next;
    sessionStorage.setItem(RESET_KEY, JSON.stringify(map));
    return next;
  } catch {
    return 1;
  }
}

/** Root-level fallback — only used when the root layout itself fails. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const key = String(error.digest || error.message || error.name || "unknown");
  const [giveUp, setGiveUp] = useState(() => {
    if (typeof window === "undefined") return false;
    return readResetCount(key) >= 2;
  });

  useEffect(() => {
    console.error(error);
    const count = readResetCount(key);
    if (count >= 2) {
      setGiveUp(true);
      return;
    }
    bumpResetCount(key);
    reset();
  }, [error, key, reset]);

  if (!giveUp) {
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
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.removeItem(RESET_KEY);
                } catch {
                  // ignore
                }
                window.location.reload();
              }}
            >
              再読み込み
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.removeItem(RESET_KEY);
                } catch {
                  // ignore
                }
                reset();
              }}
            >
              再試行
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
