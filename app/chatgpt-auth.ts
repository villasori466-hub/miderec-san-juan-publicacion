import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "cloudflare:workers";

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";
const LOCAL_SESSION_COOKIE = "local_admin_session";

/**
 * Extrae el nombre de host (sin puerto) de una cabecera `Host`, incluyendo
 * direcciones IPv6 entre corchetes como `[::1]`.
 */
function hostnameOf(host: string): string {
  const value = host.trim().toLowerCase();
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    return end >= 0 ? value.slice(0, end + 1) : value;
  }
  const colon = value.indexOf(":");
  return colon >= 0 ? value.slice(0, colon) : value;
}

/**
 * El acceso local por cookie SOLO se habilita cuando existe la variable de
 * entorno `LOCAL_DEV_AUTH` (definida únicamente en `.dev.vars`, nunca en
 * producción). No depende de la cabecera `Host` —que es falsificable— para
 * decidir la autenticación: exige un flag de despliegue explícito. El chequeo
 * de host se conserva solo como segundo cierre y usa coincidencia EXACTA
 * (no substring), evitando que un dominio como `mi-localhost.app` lo active.
 */
export function localDevAuthEnabled(): boolean {
  const runtime = env as unknown as { LOCAL_DEV_AUTH?: string };
  const flag = (runtime.LOCAL_DEV_AUTH ?? "").trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes" || flag === "on";
}

export function isLoopbackHost(host: string): boolean {
  const name = hostnameOf(host);
  return name === "localhost" || name === "127.0.0.1" || name === "[::1]";
}

export function canUseLocalDevAuth(host: string | null | undefined): boolean {
  return localDevAuthEnabled() && isLoopbackHost(host ?? "");
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  let email = requestHeaders.get(USER_EMAIL_HEADER);

  // Respaldo SOLO para desarrollo local: requiere el flag LOCAL_DEV_AUTH
  // (ausente en producción) y un host loopback exacto. Sin el flag, la cookie
  // de sesión local se ignora por completo, incluso si un cliente falsifica
  // la cabecera Host.
  if (!email && canUseLocalDevAuth(requestHeaders.get("host"))) {
    const cookieStore = await cookies();
    const localSession = cookieStore.get(LOCAL_SESSION_COOKIE);
    if (localSession) {
      email = localSession.value;
    }
  }

  if (!email) return null;

  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName &&
    requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return {
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  const requestHeaders = await headers();
  if (canUseLocalDevAuth(requestHeaders.get("host"))) {
    redirect(`/local-login?return_to=${encodeURIComponent(returnTo)}`);
  }

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
