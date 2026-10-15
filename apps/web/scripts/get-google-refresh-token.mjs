/**
 * One-time setup: get a Google OAuth refresh token + create the export folder.
 *
 * Usage:
 *   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/get-google-refresh-token.mjs
 *   — or —
 *   node scripts/get-google-refresh-token.mjs <client_id> <client_secret>
 *
 * Opens a consent URL — sign in with the account that should OWN the exports
 * (your own Gmail is fine). Prints the env lines to paste into .env.local.
 */
import http from "node:http";
import { exec } from "node:child_process";

const CLIENT_ID = process.argv[2] || process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.argv[3] || process.env.GOOGLE_CLIENT_SECRET;
const PORT = 5385;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
].join(" ");
const FOLDER_NAME = process.env.DRIVE_FOLDER_NAME || "COWELL_PROJECT";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("client id/secret লাগবে:\n  node scripts/get-google-refresh-token.mjs <id> <secret>");
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  }).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== "/callback") {
    res.end("waiting for /callback ...");
    return;
  }
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  if (err || !code) {
    res.end(`Error: ${err || "no code"}`);
    console.error("Auth failed:", err);
    server.close();
    process.exit(1);
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.refresh_token) {
      throw new Error("refresh_token আসেনি — console log দেখুন: " + JSON.stringify(tokens));
    }

    // Find or create the export root folder in this account's Drive
    const headers = {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    };
    const q = encodeURIComponent(
      `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`
    );
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name)&q=${q}`,
      { headers }
    );
    const list = await listRes.json();
    let folderId = list.files?.find((f) => f.name === FOLDER_NAME)?.id;
    if (!folderId) {
      const createRes = await fetch(
        "https://www.googleapis.com/drive/v3/files?fields=id",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: FOLDER_NAME,
            mimeType: "application/vnd.google-apps.folder",
            parents: ["root"],
          }),
        }
      );
      folderId = (await createRes.json()).id;
    }

    res.end("Done! এই tab বন্ধ করে terminal-এ ফিরে যান।");
    console.log("\n✅ সব ঠিক আছে! .env.local-এ এই লাইনগুলো বসান:\n");
    console.log(`GOOGLE_DRIVE_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GOOGLE_DRIVE_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`GOOGLE_SHARED_DRIVE_FOLDER_ID=${folderId}`);
    console.log(`\n(ফোল্ডার "${FOLDER_NAME}" আপনার Drive-এ তৈরি/পাওয়া গেছে)`);
  } catch (e) {
    res.end("Error — terminal দেখুন");
    console.error("Failed:", e);
  } finally {
    server.close();
    process.exit(0);
  }
});

server.listen(PORT, () => {
  console.log("\nএই URLটা browser-এ খুলুন এবং আপনার Google অ্যাকাউন্ট দিয়ে consent দিন:\n");
  console.log(authUrl + "\n");
  try {
    exec(`xdg-open "${authUrl}" 2>/dev/null || open "${authUrl}" 2>/dev/null`);
  } catch {
    // user opens manually
  }
});
