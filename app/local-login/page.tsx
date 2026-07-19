import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "cloudflare:workers";
import Link from "next/link";
import { canUseLocalDevAuth, safeRelativeReturnPath } from "../chatgpt-auth";
import styles from "../admin/admin.module.css";

/**
 * Compara dos cadenas en tiempo aproximadamente constante para no filtrar la
 * longitud/contenido de la contraseña a través del tiempo de respuesta.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function LocalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string; error?: string }>;
}) {
  // El login local es exclusivamente una comodidad de desarrollo. Fuera de un
  // entorno local con LOCAL_DEV_AUTH activo, esta pantalla no existe.
  const requestHeaders = await headers();
  if (!canUseLocalDevAuth(requestHeaders.get("host"))) {
    redirect("/");
  }

  const params = await searchParams;
  // Solo rutas internas: nunca redirigir a un dominio externo tras el login.
  const returnTo = safeRelativeReturnPath(params.return_to ?? "/admin");
  const errorType = params.error;

  let errorMessage = "";
  if (errorType === "email") {
    errorMessage = "El correo no está en la lista de administradores.";
  } else if (errorType === "password") {
    errorMessage = "Contraseña incorrecta. Inténtalo de nuevo.";
  } else if (errorType === "config") {
    errorMessage = "Falta definir ADMIN_PASSWORD en .dev.vars para el acceso local.";
  } else if (errorType === "unauthorized") {
    errorMessage = "Debes iniciar sesión para acceder al panel.";
  }

  async function handleLogin(formData: FormData) {
    "use server";
    const actionHeaders = await headers();
    if (!canUseLocalDevAuth(actionHeaders.get("host"))) {
      redirect("/");
    }

    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    const runtime = env as unknown as { ADMIN_EMAILS?: string; ADMIN_PASSWORD?: string };
    const adminEmails = new Set(
      (runtime.ADMIN_EMAILS ?? "")
        .split(/[;,\s]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    );
    const correctPassword = (runtime.ADMIN_PASSWORD ?? "").trim();

    // Sin ADMIN_PASSWORD configurada no se puede iniciar sesión: no existe una
    // contraseña por defecto embebida en el código.
    if (!correctPassword) {
      redirect(`/local-login?error=config&return_to=${encodeURIComponent(returnTo)}`);
    }

    if (!adminEmails.has(email)) {
      redirect(`/local-login?error=email&return_to=${encodeURIComponent(returnTo)}`);
    }

    if (!safeEqual(password, correctPassword)) {
      redirect(`/local-login?error=password&return_to=${encodeURIComponent(returnTo)}`);
    }

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("local_admin_session", email, {
      httpOnly: true,
      secure: false, // local dev
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
    });

    redirect(returnTo);
  }

  return (
    <main className={styles.accessPage}>
      <section className={styles.accessCard} style={{ maxWidth: "460px" }} aria-labelledby="login-title">
        <span className={styles.accessMark} aria-hidden="true">
          SJ
        </span>
        <p className={styles.eyebrow} style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Control de acceso local
        </p>
        <h1 id="login-title" style={{ margin: "0 0 12px 0", font: "800 36px/1 var(--font-public-display), Arial Narrow, sans-serif" }}>
          Iniciar Sesión
        </h1>
        <p style={{ margin: "0 0 24px 0", color: "#a5b8da", fontSize: "15px", lineHeight: "1.5" }}>
          Ingresa tus credenciales de administrador para gestionar la plataforma localmente.
        </p>

        <form action={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label htmlFor="email" style={{ fontSize: "14px", fontWeight: "700", color: "#9db9ee" }}>
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="ejemplo@gmail.com"
              style={{
                width: "100%",
                height: "48px",
                padding: "0 14px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "15px",
                outline: "none",
                transition: "border-color 180ms ease, box-shadow 180ms ease",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label htmlFor="password" style={{ fontSize: "14px", fontWeight: "700", color: "#9db9ee" }}>
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              style={{
                width: "100%",
                height: "48px",
                padding: "0 14px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "15px",
                outline: "none",
                transition: "border-color 180ms ease, box-shadow 180ms ease",
              }}
            />
          </div>

          {errorMessage && (
            <div
              role="alert"
              style={{
                padding: "12px 14px",
                background: "rgba(236, 37, 48, 0.15)",
                borderLeft: "4px solid #ec2530",
                color: "#ff8c93",
                fontSize: "14px",
                fontWeight: "600",
                borderRadius: "4px",
              }}
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            style={{
              height: "48px",
              marginTop: "8px",
              background: "linear-gradient(180deg, #f43b45, #d61a25)",
              color: "#fff",
              fontSize: "16px",
              fontWeight: "750",
              borderRadius: "24px",
              cursor: "pointer",
              transition: "transform 150ms ease, box-shadow 150ms ease",
              boxShadow: "0 8px 20px rgba(236, 37, 48, 0.25)",
            }}
          >
            Entrar al Panel
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "18px" }}>
          <Link href="/" style={{ color: "#a5b8da", fontSize: "14px", textDecoration: "none", transition: "color 150ms ease" }}>
            ← Volver al portal público
          </Link>
        </div>
      </section>
    </main>
  );
}
