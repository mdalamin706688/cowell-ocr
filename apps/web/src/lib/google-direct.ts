/**
 * Browser-direct Google Drive credential — static-host escape hatch.
 *
 * ⚠️ INSECURE BY DESIGN: NEXT_PUBLIC_* values ship inside the public JS
 * bundle. Anyone who loads the site can extract the refresh token and mint
 * access tokens for that Google account until it is revoked.
 *
 * Mandatory mitigations if this is used:
 *  - Use a DEDICATED bot Google account that owns only the export root
 *    folder — never a personal account (a leaked `drive`-scope token on a
 *    personal Gmail exposes every file in it).
 *  - Grant only `drive` + `spreadsheets` scopes.
 *  - Restrict the OAuth client to known origins where possible and rotate
 *    the refresh token if the site is ever exposed beyond intended users.
 */
let cached: { token: string; expiresAt: number } | null = null;

export function isDirectDriveConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID?.trim() &&
      process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_SECRET?.trim() &&
      process.env.NEXT_PUBLIC_GOOGLE_DRIVE_REFRESH_TOKEN?.trim()
  );
}

/** Exchange the embedded refresh token for a short-lived access token. */
export async function getDirectDriveAccessToken(): Promise<string> {
  if (!isDirectDriveConfigured()) {
    throw new Error("Google Drive連携が未設定です");
  }
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.token;
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID!.trim(),
      client_secret: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_SECRET!.trim(),
      refresh_token: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_REFRESH_TOKEN!.trim(),
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Google認証に失敗しました");
  }
  cached = {
    token: data.access_token as string,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}
