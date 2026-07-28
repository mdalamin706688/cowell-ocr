import { NextRequest, NextResponse } from "next/server";
import type { OcrRow } from "@cowell/shared";
import type { DriveSourceFile } from "@/lib/sheets-export";
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
    const { rows, projectName, title, sourceFiles, accessToken, rootFolderName, folderId } =
      body as {
        rows: OcrRow[];
        projectName?: string;
        title?: string;
        sourceFiles?: DriveSourceFile[];
        accessToken?: string;
        rootFolderName?: string;
        folderId?: string | null;
      };

    if (!rows?.length) {
      return NextResponse.json({ error: "エクスポートするデータがありません" }, { status: 400 });
    }

    const result = await exportToGoogleSheets(rows, projectName || title || "現調", {
      accessToken: accessToken?.trim() || undefined,
      sourceFiles,
      rootFolderName,
      folderId: folderId ?? null,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "エクスポートに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
