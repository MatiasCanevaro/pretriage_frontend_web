import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getSession } from "@/lib/session";
import { getStaffContext } from "@/lib/staff-context";

export const dynamic = "force-dynamic";

function routeFor(role: string, hospitalId: number) {
  if (role === "RECEPCIONISTA") return "/recepcion";
  if (role === "MEDICO") return "/medico";
  if (role === "ADMIN_HOSPITAL") return `/admin/hospital?hospitalId=${hospitalId}`;
  return null;
}

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  const context = await getStaffContext();
  const spaces = context?.membresias.flatMap((membership) =>
    membership.roles.flatMap((role) => {
      const route = routeFor(role, membership.hospitalId);
      return route ? [{ membership, role, route }] : [];
    }),
  ) ?? [];
  if (spaces.length === 1) redirect(spaces[0].route);

  return (
    <main className="public-shell">
      <section className="workspace-card">
        <Brand size="large" />
        <p className="eyebrow">Espacios de trabajo</p>
        <h1>{spaces.length ? "¿Dónde vas a trabajar?" : "Sin acceso hospitalario"}</h1>
        <p className="muted">
          {spaces.length
            ? "Elegí el hospital y la función para esta sesión."
            : `La cuenta ${session.user.email ?? "actual"} todavía no tiene una membresía activa.`}
        </p>
        <div className="workspace-grid">
          {spaces.map(({ membership, role, route }) => (
            <a className="workspace-option" href={route} key={`${membership.id}-${role}`}>
              <strong>{membership.hospitalNombre}</strong>
              <span>{role.replaceAll("_", " ").toLocaleLowerCase("es")}</span>
            </a>
          ))}
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="button button-secondary button-wide" type="submit">Cerrar sesión</button>
        </form>
      </section>
    </main>
  );
}
