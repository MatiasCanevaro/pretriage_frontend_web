import type { HospitalRole, StaffMembership } from "@/lib/staff-context";

export function hospitalRoute(role: HospitalRole, hospitalId: number) {
  if (role === "RECEPCIONISTA") return `/recepcion?hospitalId=${hospitalId}`;
  if (role === "MEDICO") return `/medico?hospitalId=${hospitalId}`;
  if (role === "ADMIN_HOSPITAL") return `/admin/hospital?hospitalId=${hospitalId}`;
  return null;
}

export function defaultHospitalRoute(membership: StaffMembership) {
  const preferredRoles: HospitalRole[] = ["RECEPCIONISTA", "MEDICO", "ADMIN_HOSPITAL"];
  for (const role of preferredRoles) {
    if (membership.roles.includes(role)) return hospitalRoute(role, membership.hospitalId);
  }
  return null;
}
