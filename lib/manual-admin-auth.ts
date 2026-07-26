import { cookies } from "next/headers";
import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "@/app/chatgpt-auth";

export const MANUAL_ADMIN_COOKIE = "miderec_admin_session";
export const MANUAL_SESSION_MAX_AGE = 60 * 60 * 8;

type ManualAuthRuntime = {
  ADMIN_MANUAL_USERNAME?: string;
  ADMIN_MANUAL_EMAIL?: string;
  ADMIN_MANUAL_PASSWORD_HASH?: string;
  ADMIN_SESSION_SECRET?: string;
};

type SessionPayload = {
  v: 1;
  sub: string;
  iat: number;
  exp: number;
  nonce: string;
};

function runtime(): ManualAuthRuntime {
  return env as unknown as ManualAuthRuntime;
}

function encodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function encodeText(value: string): string {
  return encodeBytes(new TextEncoder().encode(value));
}

function decodeText(value: string): string | null {
  const bytes = decodeBytes(value);
  if (!bytes) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

function constantTimeTextEqual(left: string, right: string): boolean {
  return constantTimeEqual(new TextEncoder().encode(left), new TextEncoder().encode(right));
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(value: string, secret: string): Promise<Uint8Array> {
  const key = await importHmacKey(secret);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

export function manualAdminConfigured(): boolean {
  const config = runtime();
  return Boolean(
    config.ADMIN_MANUAL_USERNAME?.trim() &&
    config.ADMIN_MANUAL_PASSWORD_HASH?.trim() &&
    config.ADMIN_SESSION_SECRET?.trim() &&
    (config.ADMIN_SESSION_SECRET?.trim().length ?? 0) >= 32,
  );
}

export function configuredManualUsername(): string {
  return runtime().ADMIN_MANUAL_USERNAME?.trim().toLowerCase() ?? "";
}

export async function verifyManualCredentials(username: string, password: string): Promise<boolean> {
  const config = runtime();
  const configuredUsername = configuredManualUsername();
  const storedHash = config.ADMIN_MANUAL_PASSWORD_HASH?.trim() ?? "";
  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return false;

  const iterations = Number(parts[1]);
  const salt = decodeBytes(parts[2] ?? "");
  const expected = decodeBytes(parts[3] ?? "");
  if (!Number.isInteger(iterations) || iterations < 210_000 || iterations > 1_000_000 || !salt || salt.length < 16 || !expected || expected.length !== 32) {
    return false;
  }

  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations },
      material,
      256,
    ),
  );

  const usernameMatches = constantTimeTextEqual(username.trim().toLowerCase(), configuredUsername);
  return usernameMatches && constantTimeEqual(derived, expected);
}

export async function createManualSessionToken(username: string): Promise<string> {
  const secret = runtime().ADMIN_SESSION_SECRET?.trim() ?? "";
  if (!manualAdminConfigured()) throw new Error("Manual administrator authentication is not configured");
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    v: 1,
    sub: username.trim().toLowerCase(),
    iat: now,
    exp: now + MANUAL_SESSION_MAX_AGE,
    nonce: crypto.randomUUID(),
  };
  const encodedPayload = encodeText(JSON.stringify(payload));
  const signature = encodeBytes(await sign(encodedPayload, secret));
  return `${encodedPayload}.${signature}`;
}

export async function verifyManualSessionToken(token: string): Promise<SessionPayload | null> {
  const secret = runtime().ADMIN_SESSION_SECRET?.trim() ?? "";
  if (!manualAdminConfigured() || token.length > 2048) return null;
  const [encodedPayload, encodedSignature, ...rest] = token.split(".");
  if (!encodedPayload || !encodedSignature || rest.length) return null;

  const suppliedSignature = decodeBytes(encodedSignature);
  if (!suppliedSignature) return null;
  const expectedSignature = await sign(encodedPayload, secret);
  if (!constantTimeEqual(suppliedSignature, expectedSignature)) return null;

  const decoded = decodeText(encodedPayload);
  if (!decoded) return null;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(decoded) as SessionPayload;
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const configuredUsername = configuredManualUsername();
  if (
    payload.v !== 1 ||
    payload.sub !== configuredUsername ||
    !Number.isInteger(payload.iat) ||
    !Number.isInteger(payload.exp) ||
    payload.iat > now + 60 ||
    payload.exp <= now ||
    payload.exp - payload.iat !== MANUAL_SESSION_MAX_AGE ||
    typeof payload.nonce !== "string" ||
    payload.nonce.length < 16
  ) {
    return null;
  }
  return payload;
}

export async function getManualAdminUser(): Promise<ChatGPTUser | null> {
  if (!manualAdminConfigured()) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(MANUAL_ADMIN_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyManualSessionToken(token);
  if (!session) return null;
  const config = runtime();
  const email = config.ADMIN_MANUAL_EMAIL?.trim().toLowerCase() || `${session.sub}@manual.miderec`;
  return {
    displayName: "Administrador MIDEREC",
    email,
    fullName: "Administrador MIDEREC",
  };
}

export async function hashLoginBucket(value: string): Promise<string> {
  const secret = runtime().ADMIN_SESSION_SECRET?.trim() ?? "";
  if (secret.length < 32) throw new Error("Manual administrator session secret is unavailable");
  return encodeBytes(await sign(`login-rate:${value}`, secret));
}
