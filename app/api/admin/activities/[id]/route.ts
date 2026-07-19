import { getActivity, purgeActivity, updateActivity } from "@/db/activities";
import { requireAdminApi, sameOriginError } from "@/lib/admin-auth";
import { readJson, validId, validateActivityPatch, validateActivityState } from "@/lib/activity-validation";
import type { ActivityInput } from "@/lib/activity-types";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireAdminApi(); if (!auth.ok) return auth.response;
  const originError = sameOriginError(request); if (originError) return originError;
  const { id } = await params; if (!validId(id)) return Response.json({ error: "Invalid activity id" }, { status: 400 });
  const body = await readJson(request); if (!body.ok) return Response.json({ error: "Invalid request", details: body.errors }, { status: 400 });
  const parsed = validateActivityPatch(body.value); if (!parsed.ok) return Response.json({ error: "Validation failed", details: parsed.errors }, { status: 400 });
  const existing = await getActivity(id); if (!existing) return Response.json({ error: "Activity not found" }, { status: 404 });
  const merged = { ...existing, ...parsed.value.changes } as ActivityInput;
  const stateErrors = validateActivityState(merged); if (stateErrors.length) return Response.json({ error: "Validation failed", details: stateErrors }, { status: 400 });
  try {
    const result = await updateActivity(id, parsed.value.changes, parsed.value.version, auth.user.email.toLowerCase());
    if (result.status === "not_found") return Response.json({ error: "Activity not found" }, { status: 404 });
    if (result.status === "conflict") return Response.json({ error: "Activity was changed by another editor" }, { status: 409 });
    return Response.json({ activity: result.activity });
  } catch (error) {
    if (String(error).toLowerCase().includes("unique") && String(error).includes("slug")) return Response.json({ error: "Slug already exists" }, { status: 409 });
    return Response.json({ error: "Unable to update activity" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const auth = await requireAdminApi(); if (!auth.ok) return auth.response;
  const originError = sameOriginError(request); if (originError) return originError;
  const { id } = await params; if (!validId(id)) return Response.json({ error: "Invalid activity id" }, { status: 400 });
  const version = Number(new URL(request.url).searchParams.get("version"));
  if (!Number.isSafeInteger(version) || version < 1) {
    return Response.json({ error: "A valid version is required" }, { status: 400 });
  }
  try {
    const existing = await getActivity(id);
    if (!existing) return Response.json({ error: "Activity not found" }, { status: 404 });
    if (existing.editorialStatus !== "archived") {
      return Response.json(
        { error: "Archiva la actividad antes de eliminarla definitivamente" },
        { status: 409 },
      );
    }
    const result = await purgeActivity(id, version);
    if (result.status === "not_found") return Response.json({ error: "Activity not found" }, { status: 404 });
    if (result.status === "conflict") return Response.json({ error: "Activity was changed by another editor" }, { status: 409 });
    return Response.json({ deleted: true, activity: result.activity });
  } catch {
    return Response.json({ error: "Unable to delete activity" }, { status: 500 });
  }
}
