import { env } from "cloudflare:workers";
import { redirect } from "next/navigation";
import { getChatGPTUser, safeRelativeReturnPath, type ChatGPTUser } from "@/app/chatgpt-auth";
import { getManualAdminUser } from "@/lib/manual-admin-auth";

type AdminResult = { ok: true; user: ChatGPTUser } | { ok: false; response: Response };

function allowedAdminEmails() {
  const runtime = env as unknown as { ADMIN_EMAILS?: string };
  return new Set((runtime.ADMIN_EMAILS ?? "").split(/[;,\s]+/).map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export async function requireAdminPage(returnTo: string): Promise<ChatGPTUser | null> {
  const manualUser = await getManualAdminUser();
  if (manualUser) return manualUser;

  const chatGPTUser = await getChatGPTUser();
  if (chatGPTUser) {
    return allowedAdminEmails().has(chatGPTUser.email.trim().toLowerCase())
      ? chatGPTUser
      : null;
  }

  const safeReturnTo = safeRelativeReturnPath(returnTo);
  redirect(`/admin/login?return_to=${encodeURIComponent(safeReturnTo)}`);
}

export async function requireAdminApi(): Promise<AdminResult> {
  const manualUser = await getManualAdminUser();
  if (manualUser) return { ok: true, user: manualUser };

  const user = await getChatGPTUser();
  if (!user) return { ok: false, response: Response.json({ error: "Authentication required" }, { status: 401 }) };
  if (!allowedAdminEmails().has(user.email.trim().toLowerCase())) {
    return { ok: false, response: Response.json({ error: "Administrator access required" }, { status: 403 }) };
  }
  return { ok: true, user };
}

export function sameOriginError(request: Request): Response | null {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) return Response.json({ error: "Cross-origin mutation rejected" }, { status: 403 });
    } catch { return Response.json({ error: "Invalid Origin header" }, { status: 403 }); }
  }
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return Response.json({ error: "Cross-origin mutation rejected" }, { status: 403 });
  return null;
}
