import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/route";
import { backendRequest } from "@/lib/api/server";

type Body = Record<string, unknown> & { operation?: string; hospitalId?: number };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    if (body.operation === "bootstrap") {
      return NextResponse.json(await backendRequest("/api/platform/hospitales"));
    }
    if (body.operation === "inviteFirstAdmin") {
      if (!Number.isSafeInteger(body.hospitalId)) {
        return NextResponse.json({ message: "Hospital inválido." }, { status: 400 });
      }
      return NextResponse.json(await backendRequest(
        `/api/platform/hospitales/${body.hospitalId}/primer-admin/invitaciones`,
        { method: "POST", body: JSON.stringify(body.invitation) },
      ));
    }
    return NextResponse.json({ message: "Operación inválida." }, { status: 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
