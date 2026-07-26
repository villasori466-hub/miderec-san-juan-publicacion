import { env } from "cloudflare:workers";
import { hashLoginBucket } from "@/lib/manual-admin-auth";

type LoginAttemptRow = {
  failed_count: number;
  window_started_at: number;
  locked_until: number;
};

type LimitPolicy = {
  maximumFailures: number;
  windowSeconds: number;
  lockSeconds: number;
};

type Bucket = {
  key: string;
  policy: LimitPolicy;
};

const COMPOSITE_POLICY: LimitPolicy = {
  maximumFailures: 5,
  windowSeconds: 15 * 60,
  lockSeconds: 30 * 60,
};

const USERNAME_POLICY: LimitPolicy = {
  maximumFailures: 20,
  windowSeconds: 30 * 60,
  lockSeconds: 30 * 60,
};

function database(): D1Database {
  const runtime = env as unknown as { DB?: D1Database };
  if (!runtime.DB) throw new Error("D1 binding is unavailable");
  return runtime.DB;
}

function clientAddress(request: Request): string {
  return request.headers.get("cf-connecting-ip")?.trim() || "local-or-unknown";
}

async function bucketsFor(request: Request, username: string): Promise<Bucket[]> {
  const normalizedUsername = username.trim().toLowerCase();
  const address = clientAddress(request);
  return [
    {
      key: await hashLoginBucket(`pair:${address}:${normalizedUsername}`),
      policy: COMPOSITE_POLICY,
    },
    {
      key: await hashLoginBucket(`user:${normalizedUsername}`),
      policy: USERNAME_POLICY,
    },
  ];
}

async function readAttempt(bucketKey: string): Promise<LoginAttemptRow | null> {
  return database()
    .prepare(
      `SELECT failed_count, window_started_at, locked_until
       FROM admin_login_attempts
       WHERE bucket_key = ?1`,
    )
    .bind(bucketKey)
    .first<LoginAttemptRow>();
}

export async function checkLoginRateLimit(
  request: Request,
  username: string,
): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  const now = Math.floor(Date.now() / 1000);
  const buckets = await bucketsFor(request, username);
  let retryAfter = 0;
  for (const bucket of buckets) {
    const attempt = await readAttempt(bucket.key);
    if (attempt?.locked_until && attempt.locked_until > now) {
      retryAfter = Math.max(retryAfter, attempt.locked_until - now);
    }
  }
  return retryAfter > 0 ? { allowed: false, retryAfter } : { allowed: true };
}

export async function recordFailedLogin(request: Request, username: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const buckets = await bucketsFor(request, username);
  for (const bucket of buckets) {
    const existing = await readAttempt(bucket.key);
    const windowExpired =
      !existing || now - existing.window_started_at >= bucket.policy.windowSeconds;
    const failedCount = windowExpired ? 1 : existing.failed_count + 1;
    const windowStartedAt = windowExpired ? now : existing.window_started_at;
    const lockedUntil =
      failedCount >= bucket.policy.maximumFailures
        ? now + bucket.policy.lockSeconds
        : Math.max(0, existing?.locked_until ?? 0);

    await database()
      .prepare(
        `INSERT INTO admin_login_attempts
          (bucket_key, failed_count, window_started_at, locked_until, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(bucket_key) DO UPDATE SET
          failed_count = excluded.failed_count,
          window_started_at = excluded.window_started_at,
          locked_until = excluded.locked_until,
          updated_at = excluded.updated_at`,
      )
      .bind(bucket.key, failedCount, windowStartedAt, lockedUntil, now)
      .run();
  }
}

export async function clearLoginAttempts(request: Request, username: string): Promise<void> {
  const buckets = await bucketsFor(request, username);
  await database().batch(
    buckets.map((bucket) =>
      database().prepare("DELETE FROM admin_login_attempts WHERE bucket_key = ?1").bind(bucket.key),
    ),
  );
}
