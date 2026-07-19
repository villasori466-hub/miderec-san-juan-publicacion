import { env } from "cloudflare:workers";

type MediaObject = { body: ReadableStream<Uint8Array>; size: number; httpEtag?: string; httpMetadata?: { contentType?: string; cacheControl?: string }; writeHttpMetadata?: (headers: Headers) => void };
type Bucket = { get(key: string): Promise<MediaObject | null> };
type Context = { params: Promise<{ key: string[] | string }> };

export async function GET(_request: Request, { params }: Context) {
  const raw = (await params).key;
  const parts = Array.isArray(raw) ? raw : [raw];
  if (!parts.length || parts.some((part) => !/^[A-Za-z0-9._-]+$/.test(part) || part === "." || part === "..")) return Response.json({ error: "Invalid media key" }, { status: 400 });
  const bucket = (env as unknown as { MEDIA?: Bucket }).MEDIA; if (!bucket) return Response.json({ error: "Media storage is unavailable" }, { status: 503 });
  const object = await bucket.get(parts.join("/")); if (!object) return Response.json({ error: "Media not found" }, { status: 404 });
  const headers = new Headers(); object.writeHttpMetadata?.(headers);
  headers.set("Content-Type", object.httpMetadata?.contentType ?? headers.get("Content-Type") ?? "application/octet-stream");
  headers.set("Content-Length", String(object.size)); headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff"); headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
  if (object.httpEtag) headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}
