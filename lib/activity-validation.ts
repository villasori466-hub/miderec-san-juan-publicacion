import {
  dateStatuses,
  editorialStatuses,
  eventStatuses,
  type ActivityChanges,
  type ActivityInput,
  type ActivitySubmissionInput,
  type SubmissionReviewInput,
  type ValidationResult,
} from "./activity-types";

const activityKeys = new Set([
  "slug", "title", "sport", "municipality", "venue", "summary", "dateStatus",
  "startAt", "endAt", "eventStatus", "editorialStatus", "publishAt", "unpublishAt",
  "featured", "imageUrl", "videoUrl", "registrationUrl",
]);
const reviewOverrideKeys = new Set([
  "slug", "title", "sport", "municipality", "venue", "summary", "dateStatus",
  "startAt", "endAt", "eventStatus", "imageUrl", "videoUrl", "registrationUrl",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function unknownKeys(value: Record<string, unknown>, allowed: Set<string>) {
  return Object.keys(value).filter((key) => !allowed.has(key));
}

function text(value: unknown, name: string, min: number, max: number, errors: string[]) {
  if (typeof value !== "string") {
    errors.push(`${name} must be a string`);
    return "";
  }
  const clean = value.trim();
  if (clean.length < min || clean.length > max) errors.push(`${name} must be ${min}-${max} characters`);
  return clean;
}

function nullableUnix(value: unknown, name: string, errors: string[]): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 253402300799) {
    errors.push(`${name} must be a nullable Unix timestamp in seconds`);
    return null;
  }
  return value as number;
}

function url(value: unknown, name: string, errors: string[]) {
  if (value === undefined || value === null || value === "") return "";
  const clean = text(value, name, 1, 2048, errors);
  if (!clean) return "";
  if (clean.startsWith("/") && !clean.startsWith("//")) return clean;
  try {
    const parsed = new URL(clean);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return clean;
  } catch {}
  errors.push(`${name} must be an http(s) or root-relative URL`);
  return "";
}

function enumValue<T extends readonly string[]>(value: unknown, name: string, values: T, fallback: T[number], errors: string[]) {
  if (value === undefined) return fallback;
  if (typeof value === "string" && values.includes(value)) return value as T[number];
  errors.push(`${name} has an invalid value`);
  return fallback;
}

export function safeSlug(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96).replace(/-+$/g, "");
}

export function validateActivityState(value: ActivityInput) {
  const errors: string[] = [];
  if (value.dateStatus === "confirmed" && value.startAt === null) errors.push("startAt is required when dateStatus is confirmed");
  if (value.endAt !== null && (value.startAt === null || value.endAt < value.startAt)) errors.push("endAt must be at or after startAt");
  if (value.editorialStatus === "scheduled" && value.publishAt === null) errors.push("publishAt is required when editorialStatus is scheduled");
  if (value.unpublishAt !== null && value.publishAt !== null && value.unpublishAt <= value.publishAt) errors.push("unpublishAt must be after publishAt");
  return errors;
}

export function validateActivityCreate(value: unknown): ValidationResult<ActivityInput> {
  const input = record(value);
  if (!input) return { ok: false, errors: ["body must be a JSON object"] };
  const errors = unknownKeys(input, activityKeys).map((key) => `unknown field: ${key}`);
  const title = text(input.title, "title", 3, 160, errors);
  const slug = safeSlug(typeof input.slug === "string" ? input.slug : title);
  if (!slug) errors.push("slug cannot be empty");
  const result: ActivityInput = {
    slug,
    title,
    sport: text(input.sport, "sport", 2, 80, errors),
    municipality: text(input.municipality, "municipality", 2, 100, errors),
    venue: text(input.venue, "venue", 2, 180, errors),
    summary: text(input.summary, "summary", 10, 3000, errors),
    dateStatus: enumValue(input.dateStatus, "dateStatus", dateStatuses, "tbd", errors),
    startAt: nullableUnix(input.startAt, "startAt", errors),
    endAt: nullableUnix(input.endAt, "endAt", errors),
    eventStatus: enumValue(input.eventStatus, "eventStatus", eventStatuses, "scheduled", errors),
    editorialStatus: enumValue(input.editorialStatus, "editorialStatus", editorialStatuses, "draft", errors),
    publishAt: nullableUnix(input.publishAt, "publishAt", errors),
    unpublishAt: nullableUnix(input.unpublishAt, "unpublishAt", errors),
    featured: input.featured === undefined ? false : input.featured === true ? true : input.featured === false ? false : (errors.push("featured must be a boolean"), false),
    imageUrl: url(input.imageUrl, "imageUrl", errors),
    videoUrl: url(input.videoUrl, "videoUrl", errors),
    registrationUrl: url(input.registrationUrl, "registrationUrl", errors),
  };
  errors.push(...validateActivityState(result));
  return errors.length ? { ok: false, errors } : { ok: true, value: result };
}

function validateChanges(input: Record<string, unknown>, allowed = activityKeys): ValidationResult<ActivityChanges> {
  const errors = unknownKeys(input, allowed).map((key) => `unknown field: ${key}`);
  const changes: ActivityChanges = {};
  const setText = (key: "title" | "sport" | "municipality" | "venue" | "summary", min: number, max: number) => {
    if (key in input) changes[key] = text(input[key], key, min, max, errors);
  };
  if ("slug" in input) {
    changes.slug = safeSlug(text(input.slug, "slug", 1, 160, errors));
    if (!changes.slug) errors.push("slug cannot be empty");
  }
  setText("title", 3, 160); setText("sport", 2, 80); setText("municipality", 2, 100);
  setText("venue", 2, 180); setText("summary", 10, 3000);
  if ("dateStatus" in input) changes.dateStatus = enumValue(input.dateStatus, "dateStatus", dateStatuses, "tbd", errors);
  if ("startAt" in input) changes.startAt = nullableUnix(input.startAt, "startAt", errors);
  if ("endAt" in input) changes.endAt = nullableUnix(input.endAt, "endAt", errors);
  if ("eventStatus" in input) changes.eventStatus = enumValue(input.eventStatus, "eventStatus", eventStatuses, "scheduled", errors);
  if ("editorialStatus" in input) changes.editorialStatus = enumValue(input.editorialStatus, "editorialStatus", editorialStatuses, "draft", errors);
  if ("publishAt" in input) changes.publishAt = nullableUnix(input.publishAt, "publishAt", errors);
  if ("unpublishAt" in input) changes.unpublishAt = nullableUnix(input.unpublishAt, "unpublishAt", errors);
  if ("featured" in input) {
    if (input.featured === true || input.featured === false) {
      changes.featured = input.featured;
    } else {
      errors.push("featured must be a boolean");
    }
  }
  if ("imageUrl" in input) changes.imageUrl = url(input.imageUrl, "imageUrl", errors);
  if ("videoUrl" in input) changes.videoUrl = url(input.videoUrl, "videoUrl", errors);
  if ("registrationUrl" in input) changes.registrationUrl = url(input.registrationUrl, "registrationUrl", errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: changes };
}

export function validateActivityPatch(value: unknown): ValidationResult<{ version: number; changes: ActivityChanges }> {
  const input = record(value);
  if (!input) return { ok: false, errors: ["body must be a JSON object"] };
  const { version, ...fields } = input;
  if (!Number.isSafeInteger(version) || (version as number) < 1) return { ok: false, errors: ["version must be a positive integer"] };
  if (!Object.keys(fields).length) return { ok: false, errors: ["at least one activity field is required"] };
  const result = validateChanges(fields);
  return result.ok ? { ok: true, value: { version: version as number, changes: result.value } } : result;
}

export function validateSubmissionCreate(value: unknown): ValidationResult<{ submission: ActivitySubmissionInput; spam: boolean }> {
  const input = record(value);
  if (!input) return { ok: false, errors: ["body must be a JSON object"] };
  const allowed = new Set(["title", "sport", "municipality", "venue", "summary", "dateStatus", "startAt", "endAt", "imageUrl", "videoUrl", "registrationUrl", "contactName", "contactEmail", "contactPhone", "consent", "website"]);
  const errors = unknownKeys(input, allowed).map((key) => `unknown field: ${key}`);
  const email = text(input.contactEmail, "contactEmail", 5, 254, errors).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("contactEmail must be valid");
  if (input.consent !== true) errors.push("consent must be true");
  const submission: ActivitySubmissionInput = {
    title: text(input.title, "title", 3, 160, errors),
    sport: text(input.sport, "sport", 2, 80, errors),
    municipality: text(input.municipality, "municipality", 2, 100, errors),
    venue: text(input.venue, "venue", 2, 180, errors),
    summary: text(input.summary, "summary", 10, 3000, errors),
    dateStatus: enumValue(input.dateStatus, "dateStatus", dateStatuses, "tbd", errors),
    startAt: nullableUnix(input.startAt, "startAt", errors),
    endAt: nullableUnix(input.endAt, "endAt", errors),
    imageUrl: url(input.imageUrl, "imageUrl", errors),
    videoUrl: url(input.videoUrl, "videoUrl", errors),
    registrationUrl: url(input.registrationUrl, "registrationUrl", errors),
    contactName: text(input.contactName, "contactName", 2, 120, errors),
    contactEmail: email,
    contactPhone: input.contactPhone === undefined ? "" : text(input.contactPhone, "contactPhone", 0, 40, errors),
    consent: true,
  };
  if (submission.dateStatus === "confirmed" && submission.startAt === null) errors.push("startAt is required when dateStatus is confirmed");
  if (submission.endAt !== null && (submission.startAt === null || submission.endAt < submission.startAt)) errors.push("endAt must be at or after startAt");
  const website = input.website === undefined ? "" : text(input.website, "website", 0, 200, errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: { submission, spam: website.length > 0 } };
}

export function validateSubmissionReview(value: unknown): ValidationResult<SubmissionReviewInput> {
  const input = record(value);
  if (!input) return { ok: false, errors: ["body must be a JSON object"] };
  const errors = unknownKeys(input, new Set(["action", "adminNote", "activity"])).map((key) => `unknown field: ${key}`);
  if (input.action !== "accept" && input.action !== "reject") errors.push("action must be accept or reject");
  const adminNote = input.adminNote === undefined ? "" : text(input.adminNote, "adminNote", 0, 1000, errors);
  let activity: ActivityChanges = {};
  if (input.activity !== undefined) {
    const nested = record(input.activity);
    if (!nested) errors.push("activity must be an object");
    else {
      const parsed = validateChanges(nested, reviewOverrideKeys);
      if (parsed.ok) activity = parsed.value; else errors.push(...parsed.errors);
    }
  }
  if (input.action === "reject" && Object.keys(activity).length) errors.push("activity overrides are only allowed when accepting");
  return errors.length ? { ok: false, errors } : { ok: true, value: { action: input.action as "accept" | "reject", adminNote, activity } };
}

export async function readJson(request: Request, maxBytes = 64 * 1024): Promise<ValidationResult<unknown>> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json") && !contentType.includes("+json")) return { ok: false, errors: ["content-type must be application/json"] };
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return { ok: false, errors: ["request body is too large"] };
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes) return { ok: false, errors: ["request body is too large"] };
  try { return { ok: true, value: JSON.parse(body) as unknown }; }
  catch { return { ok: false, errors: ["body must contain valid JSON"] }; }
}

export function validId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
