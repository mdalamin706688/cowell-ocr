import { NextRequest, NextResponse } from "next/server";
import type { OcrRow } from "@cowell/shared";
import type { DriveSourceFile } from "@/lib/sheets-export";
import { exportToGoogleSheets, getServerFixedRootFolderId, isDriveExportConfigured } from "@/lib/sheets";

// Static FE (S3/CloudFront/Pages) calls this cross-origin via NEXT_PUBLIC_SHEETS_API_BASE_URL
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  return NextResponse.json(
    {
      driveExportConfigured: isDriveExportConfigured(),
      folderConfigured: Boolean(getServerFixedRootFolderId()),
    },
    { headers: CORS_HEADERS }
  );
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
      return NextResponse.json({ error: "エクスポートするデータがありません" }, { status: 400, headers: CORS_HEADERS });
    }

    // The root folder is fixed server-side (GOOGLE_SHEETS_FOLDER_ID) —
    // client-supplied destination fields are intentionally ignored.
    const result = await exportToGoogleSheets(rows, projectName || title || "現調", {
      sourceFiles,
    });
    return NextResponse.json(result, { headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "エクスポートに失敗しました";
    return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS });
  }
}
