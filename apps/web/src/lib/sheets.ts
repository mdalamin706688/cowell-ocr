import { exportRowsWithAccessToken, type SheetsExportResult } from "./sheets-export";
import type { OcrRow } from "@cowell/shared";
import { countRowsWithPhotos } from "./row-photo";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export type { SheetsExportResult };

function getServiceAccountCredentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const key = rawKey?.replace(/\\n/g, "\n");

  if (!email || !key) return null;
  return { email, key };
}

export function isServiceAccountConfigured(): boolean {
  return Boolean(getServiceAccountCredentials());
}

async function getGoogleAccessToken(email: string, key: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({
      iss: email,
      scope: `${SHEETS_SCOPE} ${DRIVE_SCOPE}`,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const crypto = await import("crypto");
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${header}.${claim}`);
  const signature = sign.sign(key, "base64url");
  const jwt = `${header}.${claim}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || "Google認証に失敗しました");
  }
  return data.access_token as string;
}

export async function exportToGoogleSheets(
  rows: OcrRow[],
  title: string,
  options?: { accessToken?: string }
): Promise<SheetsExportResult> {
  const folderId = process.env.GOOGLE_SHEETS_FOLDER_ID || null;

  // Prefer user token from FE Google connect
  if (options?.accessToken) {
    return exportRowsWithAccessToken({
      accessToken: options.accessToken,
      rows,
      title,
      folderId,
    });
  }

  const creds = getServiceAccountCredentials();

  if (!creds) {
    if (process.env.NODE_ENV === "development") {
      const mockId = `dev-${Date.now()}`;
      return {
        spreadsheetId: mockId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${mockId}`,
        rowCount: rows.length,
        photoCount: countRowsWithPhotos(rows),
      };
    }
    throw new Error(
      "スプレッドシート連携が未設定です。Googleアカウント接続、または GOOGLE_SERVICE_ACCOUNT_* を設定してください。"
    );
  }

  const token = await getGoogleAccessToken(creds.email, creds.key);
  return exportRowsWithAccessToken({
    accessToken: token,
    rows,
    title,
    folderId,
  });
}
