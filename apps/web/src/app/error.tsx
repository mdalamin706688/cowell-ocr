"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDomError =
    error.message.includes("removeChild") ||
    error.message.includes("insertBefore") ||
    error.name === "NotFoundError";

  return (
    <html lang="ja">
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
          <h1 className="font-display text-xl font-semibold">表示エラーが発生しました</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {isDomError
              ? "ブラウザの翻訳機能を使用している場合、ページを再読み込みしてください。"
              : "一時的な問題が発生しました。再読み込みをお試しください。"}
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
      </body>
    </html>
  );
}
