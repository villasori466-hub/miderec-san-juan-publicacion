import { createActivity, listAdminActivities } from "@/db/activities";
import { requireAdminApi, sameOriginError } from "@/lib/admin-auth";
import { readJson, validateActivityCreate } from "@/lib/activity-validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  try { return Response.json({ activities: await listAdminActivities() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Unable to load activities" }, { status: 500 }); }
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const originError = sameOriginError(request); if (originError) return originError;
  const body = await readJson(request); if (!body.ok) return Response.json({ error: "Invalid request", details: body.errors }, { status: 400 });
  const parsed = validateActivityCreate(body.value); if (!parsed.ok) return Response.json({ error: "Validation failed", details: parsed.errors }, { status: 400 });
  try { return Response.json({ activity: await createActivity(parsed.value, auth.user.email.toLowerCase()) }, { status: 201 }); }
  catch (error) {
    if (String(error).toLowerCase().includes("unique") && String(error).includes("slug")) return Response.json({ error: "Slug already exists" }, { status: 409 });
    return Response.json({ error: "Unable to create activity" }, { status: 500 });
  }
}
