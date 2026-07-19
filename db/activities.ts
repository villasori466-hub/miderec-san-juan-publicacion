import { env } from "cloudflare:workers";
import { and, asc, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "./index";
import { activities, activitySubmissions } from "./schema";
import type { ActivityChanges, ActivityInput, ActivitySubmissionInput, SubmissionStatus } from "@/lib/activity-types";
import { safeSlug } from "@/lib/activity-validation";

const now = () => Math.floor(Date.now() / 1000);
type D1Statement = { bind(...values: unknown[]): D1Statement };
type D1Binding = {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<Array<{ meta?: { changes?: number } }>>;
};

export async function listPublicActivities() {
  const current = now();
  return getDb().select().from(activities).where(and(
    or(eq(activities.editorialStatus, "published"), and(eq(activities.editorialStatus, "scheduled"), lte(activities.publishAt, current))),
    or(isNull(activities.publishAt), lte(activities.publishAt, current)),
    or(isNull(activities.unpublishAt), gt(activities.unpublishAt, current)),
  )).orderBy(desc(activities.featured), sql`case when ${activities.startAt} is null then 1 else 0 end`, asc(activities.startAt), desc(activities.createdAt)).limit(250);
}

export async function listAdminActivities() {
  return getDb().select().from(activities).orderBy(desc(activities.updatedAt)).limit(500);
}

export async function getActivity(id: string) {
  const [row] = await getDb().select().from(activities).where(eq(activities.id, id)).limit(1);
  return row ?? null;
}

export async function createActivity(input: ActivityInput, actor: string) {
  const timestamp = now();
  const [row] = await getDb().insert(activities).values({ id: crypto.randomUUID(), ...input, createdBy: actor, updatedBy: actor, createdAt: timestamp, updatedAt: timestamp, version: 1 }).returning();
  return row;
}

export async function updateActivity(id: string, changes: ActivityChanges, expectedVersion: number, actor: string) {
  const [row] = await getDb().update(activities).set({ ...changes, updatedBy: actor, updatedAt: now(), version: sql`${activities.version} + 1` })
    .where(and(eq(activities.id, id), eq(activities.version, expectedVersion))).returning();
  if (row) return { status: "ok" as const, activity: row };
  return await getActivity(id) ? { status: "conflict" as const } : { status: "not_found" as const };
}

export async function archiveActivity(
  id: string,
  expectedVersion: number,
  actor: string,
) {
  const [row] = await getDb()
    .update(activities)
    .set({
      editorialStatus: "archived",
      updatedBy: actor,
      updatedAt: now(),
      version: sql`${activities.version} + 1`,
    })
    .where(and(eq(activities.id, id), eq(activities.version, expectedVersion)))
    .returning();

  if (row) return { status: "ok" as const, activity: row };
  return (await getActivity(id))
    ? { status: "conflict" as const }
    : { status: "not_found" as const };
}

export async function purgeActivity(id: string, expectedVersion: number) {
  const [row] = await getDb()
    .delete(activities)
    .where(and(eq(activities.id, id), eq(activities.version, expectedVersion)))
    .returning();

  if (row) return { status: "ok" as const, activity: row };
  return (await getActivity(id))
    ? { status: "conflict" as const }
    : { status: "not_found" as const };
}

export async function createSubmission(input: ActivitySubmissionInput) {
  const timestamp = now();
  const [row] = await getDb().insert(activitySubmissions).values({ id: crypto.randomUUID(), ...input, status: "pending", createdAt: timestamp, updatedAt: timestamp }).returning();
  return row;
}

export async function listSubmissions(status?: SubmissionStatus) {
  const query = getDb().select().from(activitySubmissions);
  return status
    ? query.where(eq(activitySubmissions.status, status)).orderBy(desc(activitySubmissions.createdAt)).limit(500)
    : query.orderBy(desc(activitySubmissions.createdAt)).limit(500);
}

export async function getSubmission(id: string) {
  const [row] = await getDb().select().from(activitySubmissions).where(eq(activitySubmissions.id, id)).limit(1);
  return row ?? null;
}

export async function rejectSubmission(id: string, adminNote: string, actor: string) {
  const timestamp = now();
  const [row] = await getDb().update(activitySubmissions).set({ status: "rejected", adminNote, reviewedBy: actor, reviewedAt: timestamp, updatedAt: timestamp })
    .where(and(eq(activitySubmissions.id, id), eq(activitySubmissions.status, "pending"))).returning();
  if (row) return { status: "ok" as const, submission: row };
  return await getSubmission(id) ? { status: "conflict" as const } : { status: "not_found" as const };
}

export async function acceptSubmission(id: string, overrides: ActivityChanges, adminNote: string, actor: string) {
  const submission = await getSubmission(id);
  if (!submission) return { status: "not_found" as const };
  if (submission.status !== "pending") return { status: "conflict" as const };
  const activityId = crypto.randomUUID();
  const suffix = `-${submission.id.slice(0, 8)}`;
  const baseSlug = safeSlug(overrides.slug ?? submission.title).slice(0, 96 - suffix.length).replace(/-+$/g, "");
  const timestamp = now();
  const activity: ActivityInput = {
    slug: `${baseSlug || "actividad"}${suffix}`,
    title: overrides.title ?? submission.title,
    sport: overrides.sport ?? submission.sport,
    municipality: overrides.municipality ?? submission.municipality,
    venue: overrides.venue ?? submission.venue,
    summary: overrides.summary ?? submission.summary,
    dateStatus: overrides.dateStatus ?? submission.dateStatus,
    startAt: overrides.startAt !== undefined ? overrides.startAt : submission.startAt,
    endAt: overrides.endAt !== undefined ? overrides.endAt : submission.endAt,
    eventStatus: overrides.eventStatus ?? "scheduled",
    editorialStatus: "draft",
    publishAt: null,
    unpublishAt: null,
    featured: false,
    imageUrl: overrides.imageUrl ?? submission.imageUrl,
    videoUrl: overrides.videoUrl ?? submission.videoUrl,
    registrationUrl: overrides.registrationUrl ?? submission.registrationUrl,
  };
  const d1 = (env as unknown as { DB: D1Binding }).DB;
  const insert = d1.prepare(`insert into activities (id,slug,title,sport,municipality,venue,summary,date_status,start_at,end_at,event_status,editorial_status,publish_at,unpublish_at,featured,image_url,video_url,registration_url,created_by,updated_by,created_at,updated_at,version)
    select ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? from activity_submissions where id = ? and status = 'pending'`)
    .bind(activityId, activity.slug, activity.title, activity.sport, activity.municipality, activity.venue, activity.summary, activity.dateStatus, activity.startAt, activity.endAt, activity.eventStatus, "draft", null, null, 0, activity.imageUrl, activity.videoUrl, activity.registrationUrl, actor, actor, timestamp, timestamp, 1, id);
  const review = d1.prepare("update activity_submissions set status='accepted', admin_note=?, accepted_activity_id=?, reviewed_by=?, reviewed_at=?, updated_at=? where id=? and status='pending'")
    .bind(adminNote, activityId, actor, timestamp, timestamp, id);
  const results = await d1.batch([insert, review]);
  if (Number(results[1]?.meta?.changes ?? 0) < 1) return { status: "conflict" as const };
  return { status: "ok" as const, activity: await getActivity(activityId), submission: await getSubmission(id) };
}
