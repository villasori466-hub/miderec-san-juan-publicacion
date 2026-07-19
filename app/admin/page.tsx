import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import AdminDashboard from "./AdminDashboard";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAdminPage("/admin");

  if (!user) {
    return (
      <main className={styles.accessPage}>
        <section className={styles.accessCard} aria-labelledby="access-title">
          <span className={styles.accessMark} aria-hidden="true">
            SJ
          </span>
          <p className={styles.eyebrow}>Centro de contenidos</p>
          <h1 id="access-title">Acceso no autorizado</h1>
          <p>
            Tu sesión está activa, pero esta cuenta no forma parte del equipo
            autorizado para administrar MIDEREC San Juan.
          </p>
          <Link href="/">Volver al sitio público</Link>
        </section>
      </main>
    );
  }

  return (
    <AdminDashboard
      user={{
        displayName: user.displayName,
        email: user.email,
      }}
    />
  );
}
