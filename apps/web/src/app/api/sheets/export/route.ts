import { NextRequest, NextResponse } from "next/server";
import type { OcrRow } from "@cowell/shared";
import { exportToGoogleSheets } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows, title } = body as { rows: OcrRow[]; title: string };

    if (!rows?.length) {
      return NextResponse.json({ error: "エクスポートするデータがありません" }, { status: 400 });
    }

    const result = await exportToGoogleSheets(rows, title || "現調シート");
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "エクスポートに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
