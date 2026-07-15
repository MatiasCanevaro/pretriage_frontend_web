import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSession()) redirect("/");

  return (
    <main className="public-shell">
      <section className="login-card">
        <Brand size="large" />
        <p className="eyebrow">Plataforma para personal hospitalario</p>
        <h1>Ingresá a tu espacio de trabajo</h1>
        <p className="muted">
          Usá las credenciales asignadas para recepción o atención médica.
        </p>
        <LoginForm />
        <p className="privacy-note">
          Implementación provisoria: la autenticación se delega al backend.
        </p>
      </section>
    </main>
  );
}
