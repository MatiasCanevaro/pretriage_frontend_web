import { redirect } from "next/navigation";
import { DoctorWorkspace } from "@/features/doctor/doctor-workspace";
import { getSession } from "@/lib/session";
import { getStaffContext } from "@/lib/staff-context";

export const dynamic = "force-dynamic";

export default async function DoctorPage({
  searchParams,
}: {
  searchParams: Promise<{ hospitalId?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const context = await getStaffContext();

  const rawHospitalId = (await searchParams).hospitalId;
  const hospitalId = Number(Array.isArray(rawHospitalId) ? rawHospitalId[0] : rawHospitalId);
  const membership = context?.membresias.find(
    (item) =>
      item.estado === "ACTIVA" &&
      item.hospitalId === hospitalId &&
      item.roles.includes("MEDICO"),
  );
  if (!membership) redirect("/");

  return (
    <DoctorWorkspace
      hospitalId={membership.hospitalId}
      hospitalName={membership.hospitalNombre}
      roles={membership.roles}
      userName={session.user.name ?? session.user.email ?? "Profesional médico"}
    />
  );
}
