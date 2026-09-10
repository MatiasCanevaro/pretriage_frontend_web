import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { PasswordResetFlow } from "@/features/auth/password-reset-flow";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PasswordResetPage() {
  if (await getSession()) redirect("/");

  return (
    <main className="public-shell">
      <section className="login-card password-reset-card">
        <Brand size="large" />
        <PasswordResetFlow />
      </section>
    </main>
  );
}
