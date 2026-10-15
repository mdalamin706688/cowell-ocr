/**
 * Browser-direct Google Drive credential — static-host escape hatch.
 *
 * ⚠️ INSECURE BY DESIGN: NEXT_PUBLIC_* values ship inside the public JS
 * bundle. Anyone who loads the site can extract the refresh token AND the
 * service-account private key, and mint tokens for both identities.
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

function getEmbeddedServiceAccount(): { email: string; key: string } | null {
  let email = process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  let key = process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ?.replace(/\\n/g, "\n")
    .trim();
  const raw = process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if ((!email || !key) && raw) {
    try {
      const json = JSON.parse(raw) as { client_email?: string; private_key?: string };
      email = email || json.client_email?.trim();
      key = key || json.private_key;
    } catch {
      // malformed JSON — treated as unconfigured
    }
  }
  return email && key ? { email, key } : null;
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let saCached: { token: string; expiresAt: number } | null = null;

/**
 * Service-account access token minted in the browser — signs the JWT bearer
 * grant with the embedded SA private key via WebCrypto. Returns null when the
 * SA env vars are absent or the exchange fails (caller falls back to the user
 * token, keeping folder ownership user-side).
 */
export async function getDirectServiceAccountAccessToken(): Promise<string | null> {
  const sa = getEmbeddedServiceAccount();
  if (!sa) return null;
  if (saCached && Date.now() < saCached.expiresAt - 60_000) {
    return saCached.token;
  }
  try {
    const now = Math.floor(Date.now() / 1000);
    const enc = new TextEncoder();
    const head =
      bytesToBase64Url(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" }))) +
      "." +
      bytesToBase64Url(
        enc.encode(
          JSON.stringify({
            iss: sa.email,
            scope: "https://www.googleapis.com/auth/drive",
            aud: "https://oauth2.googleapis.com/token",
            iat: now,
            exp: now + 3600,
          })
        )
      );
    const key = await crypto.subtle.importKey(
      "pkcs8",
      pemToDer(sa.key),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      enc.encode(head)
    );
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${head}.${bytesToBase64Url(new Uint8Array(sig))}`,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) return null;
    saCached = {
      token: data.access_token as string,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return saCached.token;
  } catch {
    return null;
  }
}
