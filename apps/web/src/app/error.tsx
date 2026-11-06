"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { versionedAppRoute } from "@/lib/route-version";

/**
 * SPA recovery only — never document.reload (that remounts expanded shell).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const attempts = useRef(0);
  const lastDigest = useRef<string>("");
  const [giveUp, setGiveUp] = useState(false);

  useEffect(() => {
    console.error("[cowell]", error?.message || error, error?.digest);
  }, [error]);

  useEffect(() => {
    attempts.current = 0;
    lastDigest.current = "";
    setGiveUp(false);
  }, [pathname]);

  useEffect(() => {
    if (giveUp) return;

    const digest = String(error?.digest || error?.message || "err");
    if (digest !== lastDigest.current) {
      lastDigest.current = digest;
      attempts.current = 0;
    }
    attempts.current += 1;

    if (attempts.current <= 2) {
      const t = window.setTimeout(() => reset(), 50);
      return () => window.clearTimeout(t);
    }

    if (attempts.current === 3) {
      const onLogin = Boolean(pathname?.startsWith("/login"));
      const onDashboard = pathname === "/dashboard/" || pathname === "/dashboard";
      const safe = onLogin ? "/login/" : onDashboard ? "/users/" : "/dashboard/";
      const t = window.setTimeout(() => {
        router.replace(versionedAppRoute(safe));
        window.setTimeout(() => reset(), 80);
      }, 50);
      return () => window.clearTimeout(t);
    }

    setGiveUp(true);
  }, [error, giveUp, pathname, reset, router]);

  if (!giveUp) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-md items-center justify-center px-6" aria-busy>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-lumen/70" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-xl font-semibold">表示エラーが発生しました</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        一時的な問題が発生しました。ホームに戻るか、再試行してください。
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button
          type="button"
          onClick={() => {
            setGiveUp(false);
            attempts.current = 0;
            router.replace(versionedAppRoute("/dashboard/"));
            window.setTimeout(() => reset(), 80);
          }}
        >
          ホームへ
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            attempts.current = 0;
            lastDigest.current = "";
            setGiveUp(false);
            reset();
          }}
        >
          再試行
        </Button>
      </div>
    </div>
  );
}
