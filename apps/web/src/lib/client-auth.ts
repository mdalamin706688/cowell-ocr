export const SESSION_COOKIE = "cowell_session";

export interface SessionUser {
  email: string;
  name: string;
}

export const isStaticPreview = process.env.NEXT_PUBLIC_STATIC_PREVIEW === "true";

export function createSessionToken(user: SessionUser): string {
  return btoa(JSON.stringify(user));
}

export function setClientSession(user: SessionUser): void {
  const token = createSessionToken(user);
  document.cookie = `${SESSION_COOKIE}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearClientSession(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function readClientSession(): SessionUser | null {
  const match = document.cookie.match(/cowell_session=([^;]+)/);
  if (!match) return null;
  try {
    return JSON.parse(atob(match[1])) as SessionUser;
  } catch {
    return null;
  }
}

export function demoLogin(email: string, password: string): SessionUser | null {
  const demoEmail = process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL ?? "admin@cowell.local";
  const demoPassword = process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD ?? "change-me";
  if (email === demoEmail && password === demoPassword) {
    return { email, name: "管理者" };
  }
  return null;
}
