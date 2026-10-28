import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ cambio?: string | string[] }>;
}) {
  if (await getSession()) redirect("/");

  const cambio = (await searchParams).cambio;
  const passwordChanged = cambio === "exito";

  return (
    <main className="public-shell">
      <section className="login-card">
        <Brand size="large" />
        <p className="eyebrow">Plataforma para personal hospitalario</p>
        <h1>Ingresá a tu espacio de trabajo</h1>
        <p className="muted">
          Usá las credenciales asignadas para recepción o atención médica.
        </p>
        {passwordChanged ? (
          <div
            className="notice notice-success login-success-notice"
            role="status"
          >
            Tu contraseña se actualizó correctamente. Ingresá con la nueva
            contraseña.
          </div>
        ) : null}
        <LoginForm />
      </section>
    </main>
  );
}
