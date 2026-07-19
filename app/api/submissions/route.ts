import { createSubmission } from "@/db/activities";
import { sameOriginError } from "@/lib/admin-auth";
import { readJson, validateSubmissionCreate } from "@/lib/activity-validation";

export async function POST(request: Request) {
  const originError = sameOriginError(request); if (originError) return originError;
  const body = await readJson(request); if (!body.ok) return Response.json({ error: "Invalid request", details: body.errors }, { status: 400 });
  const parsed = validateSubmissionCreate(body.value); if (!parsed.ok) return Response.json({ error: "Validation failed", details: parsed.errors }, { status: 400 });
  if (parsed.value.spam) return Response.json({ accepted: true }, { status: 202 });
  try {
    const submission = await createSubmission(parsed.value.submission);
    return Response.json({ submission: { id: submission.id, status: submission.status, createdAt: submission.createdAt } }, { status: 201 });
  } catch {
    return Response.json({ error: "No se pudo registrar la propuesta. Inténtalo de nuevo." }, { status: 500 });
  }
}
