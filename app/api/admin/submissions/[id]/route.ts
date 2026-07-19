import { acceptSubmission, getSubmission, rejectSubmission } from "@/db/activities";
import { requireAdminApi, sameOriginError } from "@/lib/admin-auth";
import { readJson, validId, validateActivityState, validateSubmissionReview } from "@/lib/activity-validation";
import type { ActivityInput } from "@/lib/activity-types";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireAdminApi(); if (!auth.ok) return auth.response;
  const originError = sameOriginError(request); if (originError) return originError;
  const { id } = await params; if (!validId(id)) return Response.json({ error: "Invalid submission id" }, { status: 400 });
  const body = await readJson(request); if (!body.ok) return Response.json({ error: "Invalid request", details: body.errors }, { status: 400 });
  const parsed = validateSubmissionReview(body.value); if (!parsed.ok) return Response.json({ error: "Validation failed", details: parsed.errors }, { status: 400 });
  try {
    let result;
    if (parsed.value.action === "reject") result = await rejectSubmission(id, parsed.value.adminNote, auth.user.email.toLowerCase());
    else {
      const submission = await getSubmission(id); if (!submission) return Response.json({ error: "Submission not found" }, { status: 404 });
      const candidate = { ...submission, eventStatus: "scheduled", editorialStatus: "draft", publishAt: null, unpublishAt: null, featured: false, ...parsed.value.activity } as ActivityInput;
      const stateErrors = validateActivityState(candidate); if (stateErrors.length) return Response.json({ error: "Validation failed", details: stateErrors }, { status: 400 });
      result = await acceptSubmission(id, parsed.value.activity, parsed.value.adminNote, auth.user.email.toLowerCase());
    }
    if (result.status === "not_found") return Response.json({ error: "Submission not found" }, { status: 404 });
    if (result.status === "conflict") return Response.json({ error: "Submission has already been reviewed" }, { status: 409 });
    return Response.json(result);
  } catch (error) {
    if (String(error).toLowerCase().includes("unique") && String(error).includes("slug")) return Response.json({ error: "Unable to create a unique draft slug" }, { status: 409 });
    return Response.json({ error: "Unable to review submission" }, { status: 500 });
  }
}
