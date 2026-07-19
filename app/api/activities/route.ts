import { listPublicActivities } from "@/db/activities";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const activities = (await listPublicActivities()).map(({ createdBy: _createdBy, updatedBy: _updatedBy, version: _version, ...activity }) => activity);
    return Response.json({ activities }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Activities are temporarily unavailable" }, { status: 500 });
  }
}
