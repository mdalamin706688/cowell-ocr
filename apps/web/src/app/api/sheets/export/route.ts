import { NextRequest, NextResponse } from "next/server";
import type { OcrRow } from "@cowell/shared";
import type { DriveSourceFile } from "@/lib/sheets-export";
import { exportToGoogleSheets, getServerFixedRootFolderId, isDriveExportConfigured } from "@/lib/sheets";

export async function GET() {
  return NextResponse.json({
    driveExportConfigured: isDriveExportConfigured(),
    folderConfigured: Boolean(getServerFixedRootFolderId()),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows, projectName, title, sourceFiles } = body as {
      rows: OcrRow[];
      projectName?: string;
      title?: string;
      sourceFiles?: DriveSourceFile[];
    };

    if (!rows?.length) {
      return NextResponse.json({ error: "エクスポートするデータがありません" }, { status: 400 });
    }

    // The root folder is fixed server-side (GOOGLE_SHEETS_FOLDER_ID) —
    // client-supplied destination fields are intentionally ignored.
    const result = await exportToGoogleSheets(rows, projectName || title || "現調", {
      sourceFiles,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "エクスポートに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
