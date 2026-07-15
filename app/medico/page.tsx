import { redirect } from "next/navigation";
import { DoctorWorkspace } from "@/features/doctor/doctor-workspace";
import { getSession } from "@/lib/session";
import { getStaffContext, hasRole } from "@/lib/staff-context";

export const dynamic = "force-dynamic";

export default async function DoctorPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(await getStaffContext(), "MEDICO")) redirect("/");

  return (
    <DoctorWorkspace
      userName={session.user.name ?? session.user.email ?? "Profesional médico"}
    />
  );
}
