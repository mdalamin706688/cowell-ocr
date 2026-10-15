import { NextResponse } from "next/server";
import { getServerDriveAccessToken, getServerFixedRootFolderId } from "@/lib/sheets";
import { resolveFixedDriveRoot } from "@/lib/sheets-export";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Fixed export root + its child folder names — feeds the survey form's
 * live project-name duplicate check. Server-side Google credential only.
 */
export async function GET() {
  try {
    const token = await getServerDriveAccessToken();
    const root = await resolveFixedDriveRoot(token, getServerFixedRootFolderId());
    return NextResponse.json(
      {
        ok: true,
        id: root.id,
        name: root.name,
        children: root.children,
      },
      { headers: CORS_HEADERS }
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: CORS_HEADERS });
  }
}
