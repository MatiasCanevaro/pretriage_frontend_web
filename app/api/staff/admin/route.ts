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
        const [personal, invitaciones, auditoria] = await Promise.all([
          backendRequest(`${base}/personal`),
          backendRequest(`${base}/invitaciones`),
          backendRequest(`${base}/auditoria`),
        ]);
        return NextResponse.json({ personal, invitaciones, auditoria });
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
      case "changeStatus": {
        const membershipId = id(body.membershipId, "membershipId");
        return NextResponse.json(await backendRequest(`${base}/membresias/${membershipId}`, {
          method: "PATCH", body: JSON.stringify({ estado: body.status }),
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
