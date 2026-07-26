import { NextResponse } from "next/server";
import { safeRelativeReturnPath } from "@/app/chatgpt-auth";
import { sameOriginError } from "@/lib/admin-auth";
import {
  clearLoginAttempts,
  checkLoginRateLimit,
  recordFailedLogin,
} from "@/lib/admin-login-rate-limit";
import {
  createManualSessionToken,
  MANUAL_ADMIN_COOKIE,
  MANUAL_SESSION_MAX_AGE,
  manualAdminConfigured,
  verifyManualCredentials,
} from "@/lib/manual-admin-auth";

function loginRedirect(request: Request, returnTo: string, error: string) {
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("error", error);
  url.searchParams.set("return_to", returnTo);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const originError = sameOriginError(request);
  if (originError) return originError;

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 4096) {
    return Response.json({ error: "Request too large" }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return loginRedirect(request, "/admin", "request");
  }

  const returnTo = safeRelativeReturnPath(String(formData.get("return_to") ?? "/admin"));
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (username.length < 4 || username.length > 64 || password.length < 12 || password.length > 256) {
    return loginRedirect(request, returnTo, "invalid");
  }

  if (!manualAdminConfigured()) {
    return loginRedirect(request, returnTo, "config");
  }

  let rateLimit: Awaited<ReturnType<typeof checkLoginRateLimit>>;
  try {
    rateLimit = await checkLoginRateLimit(request, username);
  } catch {
    return loginRedirect(request, returnTo, "request");
  }
  if (!rateLimit.allowed) {
    const response = loginRedirect(request, returnTo, "locked");
    response.headers.set("Retry-After", String(rateLimit.retryAfter));
    return response;
  }

  const valid = await verifyManualCredentials(username, password);
  if (!valid) {
    try {
      await recordFailedLogin(request, username);
    } catch {
      return loginRedirect(request, returnTo, "request");
    }
    return loginRedirect(request, returnTo, "invalid");
  }

  try {
    await clearLoginAttempts(request, username);
  } catch {
    return loginRedirect(request, returnTo, "request");
  }

  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set(MANUAL_ADMIN_COOKIE, await createManualSessionToken(username), {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: MANUAL_SESSION_MAX_AGE,
    priority: "high",
  });
  return response;
}
