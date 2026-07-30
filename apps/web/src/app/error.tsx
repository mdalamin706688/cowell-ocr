"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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

function errorKey(error: Error & { digest?: string }): string {
  return String(error.digest || error.message || error.name || "unknown");
}

/** Soft-recover first — never trap the user on 表示エラー for transient soft-nav races. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const key = errorKey(error);
  const [giveUp, setGiveUp] = useState(() => {
    if (typeof window === "undefined") return false;
    return readResetCount(key) >= 2;
  });

  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    const count = readResetCount(key);
    if (count >= 2) {
      setGiveUp(true);
      return;
    }
    // Soft-reset any client error once/twice — CloudFront often strips messages.
    bumpResetCount(key);
    const t = window.setTimeout(() => reset(), 40);
    return () => window.clearTimeout(t);
  }, [error, key, reset]);

  if (!giveUp) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-xl font-semibold">表示エラーが発生しました</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        一時的な問題が発生しました。再読み込みをお試しください。
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button
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
        </Button>
        <Button
          type="button"
          variant="outline"
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
        </Button>
      </div>
    </div>
  );
}
