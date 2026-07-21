"use client";

import { GOOGLE_SHEETS_SCOPES } from "./sheets-export";

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

const GIS_SRC = "https://accounts.google.com/gsi/client";
let gisLoadPromise: Promise<void> | null = null;

function getGoogleClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";
}

export function isGoogleClientConfigured(): boolean {
  return Boolean(getGoogleClientId());
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
      existing.addEventListener("error", () => reject(new Error("Google認証スクリプトの読み込みに失敗しました")));
      if (window.google?.accounts?.oauth2) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google認証スクリプトの読み込みに失敗しました"));
    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

/**
 * Prompt the user to connect Google and return a Sheets/Drive access token.
 * Uses Google Identity Services (token client) — suitable for FE-driven export.
 */
export async function requestGoogleSheetsAccessToken(): Promise<string> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error(
      "Google連携が未設定です。NEXT_PUBLIC_GOOGLE_CLIENT_ID を設定してください。"
    );
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
        resolve(response.access_token);
      },
      error_callback: (error) => {
        reject(new Error(error.message || "Googleアカウントの接続がキャンセルされました"));
      },
    });

    // Empty prompt reuses consent when possible; "consent" forces account picker
    client.requestAccessToken({ prompt: "" });
  });
}
