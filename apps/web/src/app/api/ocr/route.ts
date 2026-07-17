import { NextRequest, NextResponse } from "next/server";
import { runGeminiOcr } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, files } = body;

    if (!prompt || !files?.length) {
      return NextResponse.json({ error: "プロンプトとファイルが必要です" }, { status: 400 });
    }

    const result = await runGeminiOcr({ prompt, files });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OCR処理に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
