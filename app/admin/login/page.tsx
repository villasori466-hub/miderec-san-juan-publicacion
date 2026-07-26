import Link from "next/link";
import { redirect } from "next/navigation";
import { chatGPTSignInPath, safeRelativeReturnPath } from "@/app/chatgpt-auth";
import { getManualAdminUser } from "@/lib/manual-admin-auth";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

function errorMessage(error: string | undefined): string {
  if (error === "invalid") return "Las credenciales no son válidas.";
  if (error === "locked") return "Acceso bloqueado temporalmente por demasiados intentos. Inténtalo más tarde.";
  if (error === "config") return "El acceso manual no está disponible temporalmente.";
  if (error === "request") return "No se pudo procesar la solicitud. Actualiza la página e inténtalo de nuevo.";
  return "";
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string; error?: string }>;
}) {
  if (await getManualAdminUser()) redirect("/admin");
  const params = await searchParams;
  const returnTo = safeRelativeReturnPath(params.return_to ?? "/admin");
  const alert = errorMessage(params.error);

  return (
    <main className={styles.accessPage}>
      <section className={`${styles.accessCard} ${styles.loginCard}`} aria-labelledby="manual-login-title">
        <span className={styles.accessMark} aria-hidden="true">SJ</span>
        <p className={styles.eyebrow}>Centro de contenidos protegido</p>
        <h1 id="manual-login-title">Acceso administrativo</h1>
        <p className={styles.loginLead}>
          Ingresa las credenciales manuales o continúa con una cuenta de ChatGPT autorizada.
        </p>

        <form action="/api/admin/session" method="post" className={styles.loginForm}>
          <input type="hidden" name="return_to" value={returnTo} />
          <div className={styles.loginField}>
            <label htmlFor="username">Usuario</label>
            <input
              className={styles.loginInput}
              id="username"
              name="username"
              type="text"
              required
              minLength={4}
              maxLength={64}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              spellCheck={false}
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
              minLength={12}
              maxLength={256}
              autoComplete="current-password"
            />
          </div>

          {alert && <div className={styles.loginAlert} role="alert">{alert}</div>}

          <button className={styles.loginSubmit} type="submit">
            Entrar de forma segura <span aria-hidden="true">→</span>
          </button>
        </form>

        <div className={styles.authDivider}><span>o</span></div>

        <Link className={styles.chatGPTLogin} href={chatGPTSignInPath(returnTo)}>
          Continuar con ChatGPT
        </Link>

        <p className={styles.securityNote}>
          Sesión cifrada y limitada a 8 horas · protección contra intentos repetidos
        </p>

        <div className={styles.loginBack}>
          <Link href="/">← Volver al portal público</Link>
        </div>
      </section>
    </main>
  );
}
