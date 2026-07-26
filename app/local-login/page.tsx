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
      <section className={`${styles.accessCard} ${styles.loginCard}`} aria-labelledby="login-title">
        <span className={styles.accessMark} aria-hidden="true">
          SJ
        </span>
        <p className={styles.eyebrow}>
          Control de acceso local
        </p>
        <h1 id="login-title">Iniciar sesión</h1>
        <p className={styles.loginLead}>
          Ingresa tus credenciales de administrador para gestionar la plataforma localmente.
        </p>

        <form action={handleLogin} className={styles.loginForm}>
          <div className={styles.loginField}>
            <label htmlFor="email">Correo electrónico</label>
            <input
              className={styles.loginInput}
              id="email"
              name="email"
              type="email"
              required
              placeholder="ejemplo@gmail.com"
              autoComplete="email"
            />
          </div>

          <div className={styles.loginField}>
            <label htmlFor="password">Contraseña</label>
            <input
              className={styles.loginInput}
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {errorMessage && (
            <div className={styles.loginAlert} role="alert">
              {errorMessage}
            </div>
          )}

          <button className={styles.loginSubmit} type="submit">
            Entrar al panel <span aria-hidden="true">→</span>
          </button>
        </form>

        <div className={styles.loginBack}>
          <Link href="/">
            ← Volver al portal público
          </Link>
        </div>
      </section>
    </main>
  );
}
