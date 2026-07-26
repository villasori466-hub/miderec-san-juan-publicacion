import { listHeroActivities, listPublicActivities } from "../db/activities";
import { toPublicActivity, type PublicActivity } from "../lib/activity-types";
import PublicHome from "./public-home";

export const dynamic = "force-dynamic";

export default async function Home() {
  let activities: PublicActivity[] = [];
  let heroActivities: PublicActivity[] = [];

  try {
    activities = (await listPublicActivities()).map(toPublicActivity);
  } catch {
    // A new deployment can briefly render before its first D1 migration is
    // available. The public surface stays usable and refreshes automatically.
  }

  try {
    heroActivities = (await listHeroActivities()).map(toPublicActivity);
  } catch {
    heroActivities = activities.slice(0, 3);
  }

  return (
    <PublicHome
      initialActivities={activities}
      initialHeroActivities={heroActivities}
    />
  );
}
