import { getBasePath } from "./client-auth";
import { getCognitoAccessToken } from "./cognito-auth";
import { isCognitoConfigured } from "./cognito-config";

/**
 * Remote Sheets export API (Lambda Function URL) — used on static hosts
 * (S3 + CloudFront / GitHub Pages) where /api/* does not exist.
 * Unset = same-origin Next.js API routes (server hosting / local dev).
 */
export function getSheetsApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SHEETS_API_BASE_URL || "").replace(/\/$/, "").trim();
}

export function isRemoteSheetsApi(): boolean {
  return Boolean(getSheetsApiBaseUrl());
}

export function sheetsApiUrl(path: "root" | "export"): string {
  const remote = getSheetsApiBaseUrl();
  return remote ? `${remote}/${path}` : `${getBasePath()}/api/sheets/${path}`;
}

/** Cognito bearer for the remote Lambda; empty headers for same-origin routes. */
export async function sheetsApiAuthHeaders(): Promise<Record<string, string>> {
  if (!isRemoteSheetsApi() || !isCognitoConfigured()) return {};
  const accessToken = await getCognitoAccessToken();
  if (!accessToken) {
    throw new Error("セッションが切れています。再度ログインしてください。");
  }
  return { Authorization: `Bearer ${accessToken}` };
}
