import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function POST(request: NextRequest) {
  const acceptsJson =
    request.headers.get("accept")?.includes("application/json") ||
    request.headers.get("x-requested-with") === "fetch";

  if (acceptsJson) {
    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);
    return response;
  }

  const response = NextResponse.redirect(new URL("/login", request.url));
  clearSessionCookie(response);
  return response;
}
