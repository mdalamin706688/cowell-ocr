import { cookies } from "next/headers";

const SESSION_COOKIE = "cowell_session";

export interface SessionUser {
  email: string;
  name: string;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const user = JSON.parse(decoded) as SessionUser;
    return user;
  } catch {
    return null;
  }
}

export function createSessionToken(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString("base64");
}

export { SESSION_COOKIE };
