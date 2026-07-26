import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeRelativeReturnPath } from "@/app/chatgpt-auth";
import { MANUAL_ADMIN_COOKIE } from "@/lib/manual-admin-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Sanea el destino: solo rutas relativas de este mismo sitio. Evita un
  // redirect abierto hacia dominios externos (?return_to=https://malicioso).
  const returnTo = safeRelativeReturnPath(url.searchParams.get("return_to") ?? "/");

  const cookieStore = await cookies();
  cookieStore.delete("local_admin_session");
  cookieStore.delete(MANUAL_ADMIN_COOKIE);

  redirect(returnTo);
}
