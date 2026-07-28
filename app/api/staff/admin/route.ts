import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/route";
import { backendRequest } from "@/lib/api/server";

type Body = Record<string, unknown> & { operation?: string; hospitalId?: number };

function id(value: unknown, name: string) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new TypeError(`${name} inválido`);
  return value;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const hospitalId = id(body.hospitalId, "hospitalId");
    const base = `/api/admin/hospitales/${hospitalId}`;
    switch (body.operation) {
      case "bootstrap": {
        const [personal, invitaciones, auditoria, configuracion] = await Promise.all([
          backendRequest(`${base}/personal`),
          backendRequest(`${base}/invitaciones`),
          backendRequest(`${base}/auditoria`),
          backendRequest(`${base}/configuracion`),
        ]);
        return NextResponse.json({ personal, invitaciones, auditoria, configuracion });
      }
      case "invite":
        return NextResponse.json(await backendRequest(`${base}/invitaciones`, {
          method: "POST", body: JSON.stringify(body.invitation),
        }));
      case "revokeInvitation": {
        const invitationId = id(body.invitationId, "invitationId");
        await backendRequest(`${base}/invitaciones/${invitationId}`, { method: "DELETE" });
        return new NextResponse(null, { status: 204 });
      }
      case "resendInvitation": {
        const invitationId = id(body.invitationId, "invitationId");
        return NextResponse.json(await backendRequest(`${base}/invitaciones/${invitationId}/reenviar`, {
          method: "POST",
        }));
      }
      case "enableSpecialty": {
        const specialtyId = id(body.specialtyId, "specialtyId");
        return NextResponse.json(await backendRequest(`${base}/configuracion/especialidades/${specialtyId}`, {
          method: "POST",
        }));
      }
      case "disableSpecialty": {
        const specialtyId = id(body.specialtyId, "specialtyId");
        return NextResponse.json(await backendRequest(`${base}/configuracion/especialidades/${specialtyId}`, {
          method: "DELETE",
        }));
      }
      case "createRoom":
        return NextResponse.json(await backendRequest(`${base}/configuracion/salas`, {
          method: "POST", body: JSON.stringify(body.room),
        }));
      case "updateRoom": {
        const roomId = id(body.roomId, "roomId");
        return NextResponse.json(await backendRequest(`${base}/configuracion/salas/${roomId}`, {
          method: "PUT", body: JSON.stringify(body.room),
        }));
      }
      case "setRoomActive": {
        const roomId = id(body.roomId, "roomId");
        return NextResponse.json(await backendRequest(`${base}/configuracion/salas/${roomId}/estado`, {
          method: "PATCH", body: JSON.stringify({ activa: body.active }),
        }));
      }
      default:
        return NextResponse.json({ message: "Operación inválida." }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof TypeError) return NextResponse.json({ message: error.message }, { status: 400 });
    return apiErrorResponse(error);
  }
}
