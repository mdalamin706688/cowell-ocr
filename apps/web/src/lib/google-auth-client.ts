"use client";

import { GOOGLE_SHEETS_SCOPES } from "./sheets-export";
import { setActiveDriveAccountEmail } from "./drive-root-folder";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => { requestAccessToken: (override?: { prompt?: string }) => void };
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
}

export interface ConnectedGoogleDrive {
  email: string;
  displayName?: string;
  accessToken: string;
  expiresAt: number;
}

const GIS_SRC = "https://accounts.google.com/gsi/client";
const SESSION_KEY = "cowell_google_drive_session_v1";

let gisLoadPromise: Promise<void> | null = null;
let memorySession: ConnectedGoogleDrive | null = null;

function getGoogleClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";
}

export function isGoogleClientConfigured(): boolean {
  return Boolean(getGoogleClientId());
}

function readSession(): ConnectedGoogleDrive | null {
  if (memorySession && memorySession.expiresAt > Date.now() + 30_000) {
    return memorySession;
  }
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConnectedGoogleDrive;
    if (!parsed?.accessToken || !parsed?.email || !parsed?.expiresAt) return null;
    if (parsed.expiresAt <= Date.now() + 30_000) {
      sessionStorage.removeItem(SESSION_KEY);
      memorySession = null;
      return null;
    }
    memorySession = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(session: ConnectedGoogleDrive): void {
  memorySession = session;
  setActiveDriveAccountEmail(session.email);
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function clearGoogleDriveSession(): void {
  memorySession = null;
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

/** Valid connected Google Drive session for this browser tab. */
export function getConnectedGoogleDrive(): ConnectedGoogleDrive | null {
  return readSession();
}

function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("ブラウザ環境でのみ利用できます"));
  }
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Google認証スクリプトの読み込みに失敗しました"))
      );
      if (window.google?.accounts?.oauth2) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Google認証スクリプトの読み込みに失敗しました"));
    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

export async function fetchGoogleDriveUser(
  accessToken: string
): Promise<{ email: string; displayName?: string }> {
  const res = await fetch(
    "https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: { message?: string } }).error?.message ||
        "Googleアカウント情報の取得に失敗しました"
    );
  }
  const email = String(
    (data as { user?: { emailAddress?: string } }).user?.emailAddress || ""
  ).trim();
  if (!email) {
    throw new Error("Googleアカウントのメールを取得できませんでした");
  }
  const displayName = String(
    (data as { user?: { displayName?: string } }).user?.displayName || ""
  ).trim();
  return { email, displayName: displayName || undefined };
}

async function requestAccessToken(selectAccount: boolean): Promise<{
  token: string;
  expiresAt: number;
}> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error(
      "Google連携が未設定です。NEXT_PUBLIC_GOOGLE_CLIENT_ID を設定してください。"
    );
  }

  // Silent reuse when not switching accounts
  if (!selectAccount) {
    const existing = readSession();
    if (existing) {
      return { token: existing.accessToken, expiresAt: existing.expiresAt };
    }
  }

  await loadGisScript();
  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google認証を初期化できませんでした");
  }

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SHEETS_SCOPES,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error_description ||
                response.error ||
                "Googleアカウントの接続に失敗しました"
            )
          );
          return;
        }
        const ttlSec = Math.max(60, Number(response.expires_in) || 3600);
        resolve({
          token: response.access_token,
          expiresAt: Date.now() + ttlSec * 1000,
        });
      },
      error_callback: (error) => {
        reject(new Error(error.message || "Googleアカウントの接続がキャンセルされました"));
      },
    });

    client.requestAccessToken({
      prompt: selectAccount ? "select_account" : "",
    });
  });
}

/**
 * Connect or switch Google Drive account (shows account picker).
 * Call this only from the destination "接続 / 切替" action — not on every export.
 */
export async function connectGoogleDrive(options?: {
  switchAccount?: boolean;
}): Promise<ConnectedGoogleDrive> {
  const switchAccount = options?.switchAccount !== false;
  if (switchAccount) clearGoogleDriveSession();

  const { token, expiresAt } = await requestAccessToken(switchAccount);
  const user = await fetchGoogleDriveUser(token);
  const session: ConnectedGoogleDrive = {
    email: user.email,
    displayName: user.displayName,
    accessToken: token,
    expiresAt,
  };
  writeSession(session);
  return session;
}

/**
 * Export helper: reuse connected session. Never opens account picker.
 * Throws if user has not connected Google yet.
 */
export function requireConnectedGoogleDrive(): ConnectedGoogleDrive {
  const session = getConnectedGoogleDrive();
  if (!session) {
    throw new Error("先にGoogleアカウントを接続してください");
  }
  return session;
}

/** @deprecated Use connectGoogleDrive / requireConnectedGoogleDrive */
export async function requestGoogleSheetsAccessToken(options?: {
  selectAccount?: boolean;
}): Promise<string> {
  if (options?.selectAccount) {
    const session = await connectGoogleDrive({ switchAccount: true });
    return session.accessToken;
  }
  const existing = getConnectedGoogleDrive();
  if (existing) return existing.accessToken;
  const session = await connectGoogleDrive({ switchAccount: true });
  return session.accessToken;
}
