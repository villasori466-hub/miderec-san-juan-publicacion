import { NextResponse } from "next/server";
import { safeRelativeReturnPath } from "@/app/chatgpt-auth";
import { MANUAL_ADMIN_COOKIE } from "@/lib/manual-admin-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeRelativeReturnPath(url.searchParams.get("return_to") ?? "/");
  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set(MANUAL_ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("local_admin_session", "", {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
