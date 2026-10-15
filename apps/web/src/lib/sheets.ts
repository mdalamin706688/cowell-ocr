import { exportRowsWithAccessToken, verifyDriveFolder, type DriveSourceFile, type SheetsExportResult } from "./sheets-export";
import type { OcrRow } from "@cowell/shared";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
// Full drive scope — drive.file only sees files the service account itself
// created, never folders shared with it. The fixed root is a user-owned
// shared folder, so drive.file returns 404 on it.
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

export type { SheetsExportResult };

/**
 * Preferred credential: stored OAuth refresh token for a fixed account.
 * Files are owned by that user — real storage quota and visible in Drive.
 * (Service accounts have zero storage quota, so media uploads fail with
 * "Service Accounts do not have storage quota" unless a Shared Drive is used.)
 */
function getRefreshTokenCredentials() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken };
}

async function getRefreshTokenAccessToken(creds: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Google認証に失敗しました");
  }
  return data.access_token as string;
}

function getServiceAccountCredentials() {
  // Preferred: split vars. Fallback: full service account JSON in one env.
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  let key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if ((!email || !key) && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const json = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) as {
        client_email?: string;
        private_key?: string;
      };
      email = email || json.client_email?.trim();
      key = key || json.private_key;
    } catch {
      // malformed JSON — fall through to null
    }
  }

  if (!email || !key) return null;
  return { email, key };
}

export function isServiceAccountConfigured(): boolean {
  return Boolean(getServiceAccountCredentials());
}

/** The fixed export root — always server-configured, never client-supplied. */
export function getServerFixedRootFolderId(): string | undefined {
  return (
    process.env.GOOGLE_SHEETS_FOLDER_ID?.trim() ||
    process.env.GOOGLE_SHARED_DRIVE_FOLDER_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_SHEETS_FOLDER_ID?.trim() ||
    undefined
  );
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

export async function getServiceAccountAccessToken(): Promise<string> {
  const creds = getServiceAccountCredentials();
  if (!creds) {
    throw new Error(
      "スプレッドシート連携が未設定です。GOOGLE_SERVICE_ACCOUNT_* を設定してください。"
    );
  }
  return getGoogleAccessToken(creds.email, creds.key);
}

export function isDriveExportConfigured(): boolean {
  return Boolean(getRefreshTokenCredentials() || getServiceAccountCredentials());
}

/** Server-side Drive credential — refresh token (fixed user) first, service account fallback. */
export async function getServerDriveAccessToken(): Promise<string> {
  const refresh = getRefreshTokenCredentials();
  if (refresh) return getRefreshTokenAccessToken(refresh);
  return getServiceAccountAccessToken();
}

export async function exportToGoogleSheets(
  rows: OcrRow[],
  projectName: string,
  options?: {
    sourceFiles?: DriveSourceFile[];
  }
): Promise<SheetsExportResult> {
  if (!isDriveExportConfigured()) {
    if (process.env.NODE_ENV === "development") {
      const mockId = `dev-${Date.now()}`;
      return {
        spreadsheetId: mockId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${mockId}`,
        rowCount: rows.length,
        photoCount: rows.filter((r) => r.photoBase64 && r.photoMimeType).length,
      };
    }
    throw new Error(
      "スプレッドシート連携が未設定です。GOOGLE_DRIVE_REFRESH_TOKEN または GOOGLE_SERVICE_ACCOUNT_* を設定してください。"
    );
  }

  const token = await getServerDriveAccessToken();
  // When both creds exist, folders are created with the SA token so the
  // retention job can delete them; file bytes stay user-owned (SA quota = 0).
  let folderAccessToken: string | undefined;
  if (getRefreshTokenCredentials() && getServiceAccountCredentials()) {
    try {
      folderAccessToken = await getServiceAccountAccessToken();
    } catch {
      folderAccessToken = undefined;
    }
  }
  const folderId = getServerFixedRootFolderId();

  // Pinned folder: resolve its real name so export verifies id+name consistently.
  // If it is set but unreachable (not shared with the service account / deleted),
  // fail loudly instead of exporting somewhere unexpected.
  let rootFolderName: string | undefined;
  if (folderId) {
    const meta = await verifyDriveFolder(token, folderId);
    if (!meta) {
      throw new Error(
        "固定フォルダにアクセスできません。GOOGLE_SHEETS_FOLDER_ID とサービスアカウントへの共有設定を確認してください。"
      );
    }
    rootFolderName = meta.name;
  }

  return exportRowsWithAccessToken({
    accessToken: token,
    folderAccessToken,
    rows,
    projectName,
    rootFolderName,
    sourceFiles: options?.sourceFiles,
    folderId,
  });
}
