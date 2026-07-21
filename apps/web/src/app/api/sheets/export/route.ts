import { NextRequest, NextResponse } from "next/server";
import type { OcrRow } from "@cowell/shared";
import { exportToGoogleSheets, isServiceAccountConfigured } from "@/lib/sheets";

export async function GET() {
  return NextResponse.json({
    serviceAccountConfigured: isServiceAccountConfigured(),
    folderConfigured: Boolean(process.env.GOOGLE_SHEETS_FOLDER_ID),
    oauthClientConfigured: Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows, title, accessToken } = body as {
      rows: OcrRow[];
      title: string;
      accessToken?: string;
    };

    if (!rows?.length) {
      return NextResponse.json({ error: "エクスポートするデータがありません" }, { status: 400 });
    }

    const result = await exportToGoogleSheets(rows, title || "現調シート", {
      accessToken: accessToken?.trim() || undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "エクスポートに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
