import { listHeroActivities, listPublicActivities } from "@/db/activities";
import { toPublicActivity } from "@/lib/activity-types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [publicRows, heroRows] = await Promise.all([
      listPublicActivities(),
      listHeroActivities(),
    ]);
    const activities = publicRows.map(toPublicActivity);
    const heroActivities = heroRows.map(toPublicActivity);
    return Response.json(
      { activities, heroActivities },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "Activities are temporarily unavailable" }, { status: 500 });
  }
}
