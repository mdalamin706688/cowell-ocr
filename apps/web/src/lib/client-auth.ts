export const SESSION_COOKIE = "cowell_session";

export interface SessionUser {
  email: string;
  name: string;
}

export const DEMO_EMAIL = "admin@cowell.local";
export const DEMO_PASSWORD = "change-me";

/** GitHub Pages preview — no server API */
export function isPreviewEnvironment(): boolean {
  if (typeof window !== "undefined") {
    return window.location.hostname.endsWith("github.io");
  }
  return process.env.NEXT_PUBLIC_STATIC_PREVIEW === "true";
}

export function getDemoEmail(): string {
  return process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL || DEMO_EMAIL;
}

export function getDemoPassword(): string {
  return process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD || DEMO_PASSWORD;
}

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
  if (email === getDemoEmail() && password === getDemoPassword()) {
    return { email, name: "管理者" };
  }
  return null;
}

export function getBasePath(): string {
  if (typeof window !== "undefined" && window.location.hostname.endsWith("github.io")) {
    const parts = window.location.pathname.split("/");
    if (parts.length > 1 && parts[1]) return `/${parts[1]}`;
  }
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}
