import { listSubmissions } from "@/db/activities";
import { requireAdminApi } from "@/lib/admin-auth";
import { submissionStatuses, type SubmissionStatus } from "@/lib/activity-types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApi(); if (!auth.ok) return auth.response;
  const value = new URL(request.url).searchParams.get("status");
  if (value && !submissionStatuses.includes(value as SubmissionStatus)) return Response.json({ error: "Invalid submission status" }, { status: 400 });
  try { return Response.json({ submissions: await listSubmissions((value || undefined) as SubmissionStatus | undefined) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Unable to load submissions" }, { status: 500 }); }
}
