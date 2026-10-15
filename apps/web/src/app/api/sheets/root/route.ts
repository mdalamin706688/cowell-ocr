import { NextResponse } from "next/server";
import { getServerDriveAccessToken, getServerFixedRootFolderId } from "@/lib/sheets";
import { resolveFixedDriveRoot } from "@/lib/sheets-export";

/**
 * Fixed export root + its child folder names — feeds the survey form's
 * live project-name duplicate check. Service account only; no user OAuth.
 */
export async function GET() {
  try {
    const token = await getServerDriveAccessToken();
    const root = await resolveFixedDriveRoot(token, getServerFixedRootFolderId());
    return NextResponse.json({
      ok: true,
      id: root.id,
      name: root.name,
      children: root.children,
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
