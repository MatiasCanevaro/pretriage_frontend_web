import { redirect } from "next/navigation";
import { ReceptionWorkspace } from "@/features/reception/reception-workspace";
import { getSession } from "@/lib/session";
import { getStaffContext, hasRole } from "@/lib/staff-context";

export const dynamic = "force-dynamic";

export default async function ReceptionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(await getStaffContext(), "RECEPCIONISTA")) redirect("/");

  return (
    <ReceptionWorkspace
      userName={session.user.name ?? session.user.email ?? "Recepcionista"}
    />
  );
}
