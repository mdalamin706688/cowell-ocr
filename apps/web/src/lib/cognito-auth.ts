import type { SessionUser } from "./client-auth";
import { clearClientSession, setClientSession } from "./client-auth";
import {
  cognitoIdpEndpoint,
  getCognitoClientId,
  isCognitoConfigured,
} from "./cognito-config";

const TOKEN_KEY = "cowell_cognito_tokens";

export interface CognitoTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export type CognitoSignInResult =
  | { status: "signed_in"; user: SessionUser }
  | { status: "new_password_required"; session: string; username: string };

interface CognitoAuthResult {
  IdToken?: string;
  AccessToken?: string;
  RefreshToken?: string;
  ExpiresIn?: number;
}

interface CognitoInitiateResponse {
  AuthenticationResult?: CognitoAuthResult;
  ChallengeName?: string;
  Session?: string;
  ChallengeParameters?: Record<string, string>;
  message?: string;
  __type?: string;
}

async function cognitoCall<T>(
  target: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(cognitoIdpEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { message?: string; __type?: string };
  if (!res.ok) {
    throw new Error(mapCognitoError(data.message || data.__type || "Cognito error"));
  }
  return data;
}

function mapCognitoError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes("notauthorized") || msg.includes("incorrect")) {
    return "メールアドレスまたはパスワードが正しくありません";
  }
  if (msg.includes("userNotConfirmed".toLowerCase())) {
    return "メールアドレスの確認が完了していません";
  }
  if (msg.includes("passwordresetrequired".toLowerCase())) {
    return "パスワードのリセットが必要です。管理者にお問い合わせください。";
  }
  if (msg.includes("userNotFound".toLowerCase())) {
    return "メールアドレスまたはパスワードが正しくありません";
  }
  if (msg.includes("invalidparameter") && msg.includes("authflow")) {
    return "Cognitoアプリクライアントで USER_PASSWORD_AUTH を有効にしてください";
  }
  return raw || "ログインに失敗しました";
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split(".")[1];
  if (!part) return {};
  const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
  const json = atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "="));
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function userFromIdToken(idToken: string): SessionUser {
  const payload = decodeJwtPayload(idToken);
  const email = String(payload.email || payload["cognito:username"] || "");
  const name = String(payload.name || payload.email || "ユーザー");
  return { email, name };
}

function persistTokens(result: CognitoAuthResult, previousRefresh?: string): CognitoTokens {
  const refreshToken = result.RefreshToken || previousRefresh || "";
  const tokens: CognitoTokens = {
    idToken: result.IdToken || "",
    accessToken: result.AccessToken || "",
    refreshToken,
    expiresAt: Date.now() + (result.ExpiresIn || 3600) * 1000,
  };
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  } catch {
    /* private mode */
  }
  const user = userFromIdToken(tokens.idToken);
  setClientSession(user);
  return tokens;
}

export function readCognitoTokens(): CognitoTokens | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CognitoTokens;
  } catch {
    return null;
  }
}

export function clearCognitoTokens(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
  clearClientSession();
}

export async function cognitoSignIn(
  email: string,
  password: string
): Promise<CognitoSignInResult> {
  if (!isCognitoConfigured()) {
    throw new Error("Cognito が設定されていません");
  }

  const data = await cognitoCall<CognitoInitiateResponse>("InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: getCognitoClientId(),
    AuthParameters: {
      USERNAME: email.trim(),
      PASSWORD: password,
    },
  });

  if (data.ChallengeName === "NEW_PASSWORD_REQUIRED") {
    return {
      status: "new_password_required",
      session: data.Session || "",
      username: email.trim(),
    };
  }

  if (!data.AuthenticationResult?.IdToken) {
    throw new Error("ログインに失敗しました");
  }

  const tokens = persistTokens(data.AuthenticationResult);
  return { status: "signed_in", user: userFromIdToken(tokens.idToken) };
}

export async function cognitoCompleteNewPassword(
  username: string,
  newPassword: string,
  session: string
): Promise<SessionUser> {
  const data = await cognitoCall<CognitoInitiateResponse>("RespondToAuthChallenge", {
    ChallengeName: "NEW_PASSWORD_REQUIRED",
    ClientId: getCognitoClientId(),
    Session: session,
    ChallengeResponses: {
      USERNAME: username,
      NEW_PASSWORD: newPassword,
    },
  });

  if (!data.AuthenticationResult?.IdToken) {
    throw new Error("新しいパスワードの設定に失敗しました");
  }

  const tokens = persistTokens(data.AuthenticationResult);
  return userFromIdToken(tokens.idToken);
}

export async function cognitoRefreshSession(): Promise<CognitoTokens | null> {
  const existing = readCognitoTokens();
  if (!existing?.refreshToken || !isCognitoConfigured()) return null;

  try {
    const data = await cognitoCall<CognitoInitiateResponse>("InitiateAuth", {
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: getCognitoClientId(),
      AuthParameters: {
        REFRESH_TOKEN: existing.refreshToken,
      },
    });
    if (!data.AuthenticationResult?.IdToken) {
      clearCognitoTokens();
      return null;
    }
    return persistTokens(data.AuthenticationResult, existing.refreshToken);
  } catch {
    clearCognitoTokens();
    return null;
  }
}

export async function getCognitoSessionUser(): Promise<SessionUser | null> {
  if (!isCognitoConfigured()) return null;

  let tokens = readCognitoTokens();
  if (!tokens?.idToken) return null;

  if (tokens.expiresAt < Date.now() + 60_000) {
    tokens = (await cognitoRefreshSession()) || tokens;
  }
  if (!tokens?.idToken) return null;
  return userFromIdToken(tokens.idToken);
}

/** Access token for future backend API calls */
export async function getCognitoAccessToken(): Promise<string | null> {
  let tokens = readCognitoTokens();
  if (!tokens?.accessToken) return null;
  if (tokens.expiresAt < Date.now() + 60_000) {
    tokens = (await cognitoRefreshSession()) || null;
  }
  return tokens?.accessToken ?? null;
}

export async function cognitoSignOut(): Promise<void> {
  const tokens = readCognitoTokens();
  if (tokens?.accessToken && isCognitoConfigured()) {
    try {
      await cognitoCall("GlobalSignOut", {
        AccessToken: tokens.accessToken,
      });
    } catch {
      /* still clear local session */
    }
  }
  clearCognitoTokens();
}
