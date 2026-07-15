import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getSession } from "@/lib/session";
import { detectStaffRole } from "@/lib/staff-role";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = await detectStaffRole();
  if (role === "reception") redirect("/recepcion");
  if (role === "doctor") redirect("/medico");

  return (
    <main className="public-shell">
      <section className="login-card">
        <Brand size="large" />
        <p className="eyebrow">Cuenta autenticada</p>
        <h1>No encontramos un perfil hospitalario</h1>
        <p className="muted">
          La cuenta de {session.user.name ?? session.user.email ?? "usuario"} no
          está registrada como recepcionista o médico en PreTriage.
        </p>
        <form action="/api/auth/logout" method="post">
          <button className="button button-secondary button-wide" type="submit">
            Cerrar sesión
          </button>
        </form>
      </section>
    </main>
  );
}
