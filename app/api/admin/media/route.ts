import { env } from "cloudflare:workers";
import { requireAdminApi, sameOriginError } from "@/lib/admin-auth";

const MAX_SIZE = 8 * 1024 * 1024;
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
type Bucket = { put(key: string, value: ArrayBuffer, options: { httpMetadata: { contentType: string; cacheControl: string }; customMetadata: Record<string, string> }): Promise<unknown> };

function validSignature(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((v, i) => bytes[i] === v);
  if (type === "image/gif") return new TextDecoder().decode(bytes.slice(0, 6)) === "GIF87a" || new TextDecoder().decode(bytes.slice(0, 6)) === "GIF89a";
  if (type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(); if (!auth.ok) return auth.response;
  const originError = sameOriginError(request); if (originError) return originError;
  const declared = Number(request.headers.get("content-length") ?? 0); if (declared > MAX_SIZE + 1024 * 1024) return Response.json({ error: "Image exceeds 8 MB" }, { status: 413 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) return Response.json({ error: "multipart/form-data is required" }, { status: 415 });
  let form: FormData; try { form = await request.formData(); } catch { return Response.json({ error: "Invalid multipart body" }, { status: 400 }); }
  const file = form.get("file"); if (!(file instanceof File)) return Response.json({ error: "file is required" }, { status: 400 });
  if (file.size < 1 || file.size > MAX_SIZE) return Response.json({ error: "Image must be between 1 byte and 8 MB" }, { status: 413 });
  const extension = extensions[file.type.toLowerCase()]; if (!extension) return Response.json({ error: "Only JPG, PNG, WebP, and GIF are allowed" }, { status: 415 });
  const data = await file.arrayBuffer(); if (!validSignature(new Uint8Array(data), file.type.toLowerCase())) return Response.json({ error: "File content does not match its image type" }, { status: 415 });
  const bucket = (env as unknown as { MEDIA?: Bucket }).MEDIA; if (!bucket) return Response.json({ error: "Media storage is unavailable" }, { status: 503 });
  const date = new Date(); const key = `activities/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${extension}`;
  try {
    await bucket.put(key, data, { httpMetadata: { contentType: file.type.toLowerCase(), cacheControl: "public, max-age=31536000, immutable" }, customMetadata: { uploadedBy: auth.user.email.toLowerCase() } });
    return Response.json({ key, url: `/media/${key}`, contentType: file.type.toLowerCase(), size: file.size }, { status: 201 });
  } catch { return Response.json({ error: "Unable to store image" }, { status: 500 }); }
}
