import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/route";
import { backendRequest } from "@/lib/api/server";
import type {
  CurrentMedicalState,
  DoctorAssignment,
  DoctorBootstrap,
  MedicalAttention,
  MedicalRoom,
  MedicalSession,
  QueueConsultation,
} from "@/lib/api/types";

type Body = Record<string, unknown> & { operation?: string };

function numberValue(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new TypeError(`${field} inválido`);
  }
  return value;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    switch (body.operation) {
      case "bootstrap": {
        const [assignments, history, current] = await Promise.all([
          backendRequest<DoctorAssignment[]>("/api/medico/asignaciones"),
          backendRequest<MedicalAttention[]>("/api/medico/atenciones"),
          backendRequest<CurrentMedicalState>("/api/medico/sesiones/actual"),
        ]);
        return NextResponse.json({
          assignments,
          history,
          session: current.sesion ?? null,
          currentConsultation: current.consultaActual ?? null,
        } satisfies DoctorBootstrap);
      }
      case "rooms": {
        const hospitalId = numberValue(body.hospitalId, "hospitalId");
        const specialty =
          typeof body.specialty === "string" ? body.specialty : "";
        return NextResponse.json(
          await backendRequest<MedicalRoom[]>(
            `/api/hospitales/${hospitalId}/salas?codigoEspecialidad=${encodeURIComponent(specialty)}`,
          ),
        );
      }
      case "startSession":
        return NextResponse.json(
          await backendRequest<MedicalSession>("/api/medico/sesiones", {
            method: "POST",
            body: JSON.stringify({
              hospitalId: numberValue(body.hospitalId, "hospitalId"),
              codigoEspecialidad:
                typeof body.specialty === "string" ? body.specialty : "",
              salaId: numberValue(body.roomId, "roomId"),
            }),
          }),
        );
      case "sessionAction": {
        const sessionId = numberValue(body.sessionId, "sessionId");
        const action = body.action;
        if (!["pausar", "reanudar", "cerrar"].includes(String(action))) {
          throw new TypeError("Acción de sesión inválida");
        }
        return NextResponse.json(
          await backendRequest<MedicalSession>(
            `/api/medico/sesiones/${sessionId}/${action}`,
            { method: "POST" },
          ),
        );
      }
      case "queue": {
        const sessionId = numberValue(body.sessionId, "sessionId");
        return NextResponse.json(
          await backendRequest<QueueConsultation[]>(
            `/api/medico/sesiones/${sessionId}/pacientes-disponibles`,
          ),
        );
      }
      case "callNext": {
        const sessionId = numberValue(body.sessionId, "sessionId");
        return NextResponse.json(
          await backendRequest<QueueConsultation>(
            `/api/medico/sesiones/${sessionId}/llamar-proximo`,
            { method: "POST" },
          ),
        );
      }
      case "consultationAction": {
        const sessionId = numberValue(body.sessionId, "sessionId");
        const consultationId = numberValue(body.consultationId, "consultationId");
        const action = body.action;
        if (!["presente", "ausente", "finalizar"].includes(String(action))) {
          throw new TypeError("Acción de consulta inválida");
        }
        return NextResponse.json(
          await backendRequest<QueueConsultation>(
            `/api/medico/sesiones/${sessionId}/consultas/${consultationId}/${action}`,
            { method: "POST" },
          ),
        );
      }
      default:
        return NextResponse.json({ message: "Operación inválida." }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof TypeError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
