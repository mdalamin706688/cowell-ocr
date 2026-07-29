import { COGNITO_SUPER_ADMIN_GROUP } from "./cognito-config";

export const SESSION_COOKIE = "cowell_session";

export interface SessionUser {
  email: string;
  name: string;
  /** Cognito group names from id token (when using User Pool groups) */
  groups?: string[];
  isSuperAdmin?: boolean;
}

export const DEMO_EMAIL = "admin@cowell.local";
export const DEMO_PASSWORD = "change-me";

/** Static hosts (GitHub Pages / CloudFront) — no server API */
export function isPreviewEnvironment(): boolean {
  // Build-time flag for S3/CloudFront and Pages static exports
  if (process.env.NEXT_PUBLIC_STATIC_PREVIEW === "true") return true;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    return host.endsWith("github.io") || host.endsWith("cloudfront.net");
  }
  return false;
}

export function getDemoEmail(): string {
  return process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL || DEMO_EMAIL;
}

export function getDemoPassword(): string {
  return process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD || DEMO_PASSWORD;
}

/** UTF-8 safe base64 (btoa alone fails on Japanese text) */
function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function createSessionToken(user: SessionUser): string {
  return encodeBase64Utf8(JSON.stringify(user));
}

export function parseSessionToken(token: string): SessionUser | null {
  try {
    return JSON.parse(decodeBase64Utf8(token)) as SessionUser;
  } catch {
    return null;
  }
}

export function setClientSession(user: SessionUser): void {
  cachedSession = user;
  if (typeof document === "undefined") return;
  const token = createSessionToken(user);
  document.cookie = `${SESSION_COOKIE}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearClientSession(): void {
  cachedSession = null;
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

let cachedSession: SessionUser | null | undefined;

/** In-memory + cookie session read — avoids auth flash on client navigations */
export function peekClientSession(): SessionUser | null {
  if (typeof document === "undefined") return null;
  if (cachedSession !== undefined) return cachedSession;
  cachedSession = readClientSessionFromCookie();
  return cachedSession;
}

function readClientSessionFromCookie(): SessionUser | null {
  const match = document.cookie.match(/cowell_session=([^;]+)/);
  if (!match) return null;
  return parseSessionToken(match[1]);
}

export function readClientSession(): SessionUser | null {
  return peekClientSession();
}

export function formatUserDisplayName(user: { email: string; name?: string }): string {
  const rawName = user.name?.trim();
  if (rawName && !rawName.includes("@")) return rawName;

  const email = user.email?.trim();
  if (!email) return "ユーザー";

  const local = email.split("@")[0]?.trim();
  if (!local) return "ユーザー";

  const primary = local.split(/[._-]/)[0] ?? local;
  if (!primary) return local;

  return primary.charAt(0).toUpperCase() + primary.slice(1);
}

export function demoLogin(email: string, password: string): SessionUser | null {
  if (email === getDemoEmail() && password === getDemoPassword()) {
    return { email, name: "管理者" };
  }
  return null;
}

/** Static preview login — ignores form values that browser translation may corrupt */
export function createPreviewSession(): SessionUser {
  return { email: getDemoEmail(), name: "管理者", groups: [COGNITO_SUPER_ADMIN_GROUP], isSuperAdmin: true };
}

export function getBasePath(): string {
  if (typeof window !== "undefined" && window.location.hostname.endsWith("github.io")) {
    const parts = window.location.pathname.split("/");
    if (parts.length > 1 && parts[1]) return `/${parts[1]}`;
  }
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}

const FLASH_PREFIX = "cowell_flash_";

/** One-time flash message (e.g. after logout) without polluting the URL */
export function setFlash(key: string): void {
  try {
    sessionStorage.setItem(`${FLASH_PREFIX}${key}`, "1");
  } catch {
    /* private browsing / storage blocked */
  }
}

export function consumeFlash(key: string): boolean {
  try {
    const storageKey = `${FLASH_PREFIX}${key}`;
    if (sessionStorage.getItem(storageKey)) {
      sessionStorage.removeItem(storageKey);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export const FLASH_LOGGED_OUT = "logged_out";
