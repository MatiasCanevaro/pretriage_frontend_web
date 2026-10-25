import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { PasswordChangeForm } from "@/features/auth/password-change-form";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PasswordChangePage() {
  if (!(await getSession())) redirect("/login");

  return (
    <main className="public-shell">
      <section className="login-card password-change-card">
        <Brand size="large" />
        <p className="eyebrow">Tu cuenta</p>
        <h1>Cambiar contraseña</h1>
        <p className="muted">
          Confirmá tu contraseña actual y elegí una nueva para seguir usando la
          plataforma.
        </p>
        <PasswordChangeForm />
      </section>
    </main>
  );
}
