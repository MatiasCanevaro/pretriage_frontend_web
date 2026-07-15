import { redirect } from "next/navigation";
import { DoctorWorkspace } from "@/features/doctor/doctor-workspace";
import { getSession } from "@/lib/session";
import { detectStaffRole } from "@/lib/staff-role";

export const dynamic = "force-dynamic";

export default async function DoctorPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if ((await detectStaffRole()) !== "doctor") redirect("/");

  return (
    <DoctorWorkspace
      userName={session.user.name ?? session.user.email ?? "Profesional médico"}
    />
  );
}
