/**
 * Sheets export Lambda — Function URL backend for the static frontend
 * (S3 + CloudFront / GitHub Pages), which has no Next.js API routes.
 *
 *   GET  (any path) → fixed root folder + its children (live duplicate check)
 *   POST (any path) → { rows, projectName, sourceFiles } → Drive/Sheets export
 *
 * Env:
 *   GOOGLE_DRIVE_CLIENT_ID / GOOGLE_DRIVE_CLIENT_SECRET / GOOGLE_DRIVE_REFRESH_TOKEN
 *     — preferred: exports as a real user (files get a real owner + quota)
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL / _PRIVATE_KEY / _JSON — fallback (needs a
 *     Shared Drive root; SAs have no storage quota of their own)
 *   GOOGLE_SHEETS_FOLDER_ID — fixed root folder (required)
 *   GOOGLE_DRIVE_SHARE_WITH — optional comma-separated emails to grant writer
 *   COGNITO_REGION / COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID — optional JWT auth
 *   ALLOWED_ORIGINS — optional comma-separated CORS allowlist
 *
 * Function URL request limit is ~6 MB — sourceFiles should stay modest.
 */
import { createPublicKey, createVerify } from "node:crypto";

import type { OcrRow } from "@cowell/shared";
import {
  exportToGoogleSheets,
  getServerDriveAccessToken,
  getServerFixedRootFolderId,
  isDriveExportConfigured,
} from "../../src/lib/sheets";
import { resolveFixedDriveRoot, type DriveSourceFile } from "../../src/lib/sheets-export";

interface LambdaHttpEvent {
  httpMethod?: string;
  requestContext?: { http?: { method?: string } };
  headers?: Record<string, string | undefined>;
  body?: string;
  isBase64Encoded?: boolean;
}

interface LambdaHttpResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const COGNITO_REGION =
  process.env.COGNITO_REGION || process.env.COGNITO_USER_POOL_ID?.split("_")[0];
const COGNITO_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const COGNITO_ISSUER =
  COGNITO_REGION && COGNITO_POOL_ID
    ? `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_POOL_ID}`
    : undefined;
const COGNITO_JWKS_URL = COGNITO_ISSUER ? `${COGNITO_ISSUER}/.well-known/jwks.json` : undefined;
const authRequired = Boolean(COGNITO_ISSUER && COGNITO_CLIENT_ID && COGNITO_JWKS_URL);

let jwksCache: { keys: unknown[] } | null = null;

function header(event: LambdaHttpEvent, name: string): string {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(event.headers || {})) {
    if (k.toLowerCase() === lower) return v ?? "";
  }
  return "";
}

function b64urlToJson(input: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(input, "base64url").toString("utf8"));
}

async function verifyCognitoToken(token: string): Promise<boolean> {
  if (!authRequired) return true;
  if (!token) return false;
  try {
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return false;
    const headerJson = b64urlToJson(h);
    const payload = b64urlToJson(p);
    const kid = String(headerJson.kid || "");
    if (headerJson.alg !== "RS256" || !kid) return false;

    if (!jwksCache) {
      const res = await fetch(COGNITO_JWKS_URL!);
      if (!res.ok) return false;
      jwksCache = await res.json();
    }
    const jwk = (jwksCache!.keys as Array<{ kid?: string }>).find((k) => k.kid === kid);
    if (!jwk) return false;

    const key = createPublicKey({ key: jwk, format: "jwk" });
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${h}.${p}`);
    if (!verifier.verify(key, Buffer.from(s, "base64url"))) return false;

    const now = Math.floor(Date.now() / 1000);
    return (
      payload.iss === COGNITO_ISSUER &&
      payload.token_use === "access" &&
      payload.client_id === COGNITO_CLIENT_ID &&
      typeof payload.exp === "number" &&
      payload.exp > now
    );
  } catch {
    return false;
  }
}

function corsHeaders(origin: string): Record<string, string> {
  const allowOrigin = ALLOWED_ORIGINS.length
    ? ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0]
    : origin || "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function respond(
  statusCode: number,
  origin: string,
  body: unknown
): LambdaHttpResult {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    body: JSON.stringify(body),
  };
}

export async function handler(event: LambdaHttpEvent): Promise<LambdaHttpResult> {
  const origin = header(event, "origin");
  const method =
    event.requestContext?.http?.method || event.httpMethod || "GET";

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }

  if (authRequired) {
    const authz = header(event, "authorization");
    const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!(await verifyCognitoToken(token))) {
      return respond(401, origin, { error: "認証が必要です" });
    }
  }

  try {
    if (method === "GET") {
      if (!isDriveExportConfigured()) {
        return respond(503, origin, { ok: false });
      }
      const token = await getServerDriveAccessToken();
      const root = await resolveFixedDriveRoot(token, getServerFixedRootFolderId());
      return respond(200, origin, {
        ok: true,
        id: root.id,
        name: root.name,
        children: root.children,
      });
    }

    if (method === "POST") {
      const raw = event.isBase64Encoded
        ? Buffer.from(event.body || "", "base64").toString("utf8")
        : event.body || "";
      const body = JSON.parse(raw || "{}") as {
        rows?: OcrRow[];
        projectName?: string;
        title?: string;
        sourceFiles?: DriveSourceFile[];
      };
      if (!body.rows?.length) {
        return respond(400, origin, { error: "エクスポートするデータがありません" });
      }
      const result = await exportToGoogleSheets(body.rows, body.projectName || body.title || "現調", {
        sourceFiles: body.sourceFiles,
      });
      return respond(200, origin, result);
    }

    return respond(405, origin, { error: "Method not allowed" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "エクスポートに失敗しました";
    return respond(500, origin, { error: message });
  }
}
