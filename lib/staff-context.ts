import "server-only";
import { backendRequest } from "@/lib/api/server";

export type HospitalRole =
  | "ADMIN_HOSPITAL"
  | "COORDINADOR_MEDICO"
  | "MEDICO"
  | "RECEPCIONISTA";

export type StaffMembership = {
  id: number;
  hospitalId: number;
  hospitalNombre: string;
  estado: "ACTIVA" | "SUSPENDIDA" | "REVOCADA" | "INVITADA";
  roles: HospitalRole[];
};

export type StaffContext = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  administradorPlataforma: boolean;
  membresias: StaffMembership[];
};

export async function getStaffContext() {
  try {
    return await backendRequest<StaffContext>("/api/staff/me");
  } catch {
    return null;
  }
}

export function hasRole(context: StaffContext | null, role: HospitalRole) {
  return context?.membresias.some((membership) => membership.roles.includes(role)) ?? false;
}
