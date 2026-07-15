import "server-only";
import { BackendApiError, backendRequest } from "@/lib/api/server";

export type StaffRole = "reception" | "doctor" | null;

export async function detectStaffRole(): Promise<StaffRole> {
  try {
    await backendRequest("/api/recepcion/hospitales");
    return "reception";
  } catch (error) {
    if (!(error instanceof BackendApiError) || ![403, 404].includes(error.status)) {
      return null;
    }
  }

  try {
    await backendRequest("/api/medico/asignaciones");
    return "doctor";
  } catch {
    return null;
  }
}
