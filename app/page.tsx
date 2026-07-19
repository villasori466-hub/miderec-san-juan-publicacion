import { listPublicActivities } from "../db/activities";
import type { PublicActivity } from "../lib/activity-types";
import PublicHome from "./public-home";

export const dynamic = "force-dynamic";

export default async function Home() {
  let activities: PublicActivity[] = [];

  try {
    activities = (await listPublicActivities()).map(
      ({ createdBy: _createdBy, updatedBy: _updatedBy, version: _version, ...activity }) =>
        activity,
    );
  } catch {
    // A new deployment can briefly render before its first D1 migration is
    // available. The public surface stays usable and refreshes automatically.
  }

  return <PublicHome initialActivities={activities} />;
}
