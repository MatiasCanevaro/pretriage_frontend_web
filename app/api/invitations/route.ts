import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/route";
import { backendRequest, publicBackendRequest } from "@/lib/api/server";

type Body = Record<string, unknown> & { operation?: string; token?: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    if (typeof body.token !== "string" || body.token.length < 20) {
      return NextResponse.json({ message: "Invitación inválida." }, { status: 400 });
    }
    const path = `/api/invitaciones/${encodeURIComponent(body.token)}`;
    if (body.operation === "summary") {
      return NextResponse.json(await publicBackendRequest(`${path}/resumen`));
    }
    if (body.operation === "register") {
      return NextResponse.json(await publicBackendRequest(`${path}/registro`, {
        method: "POST", body: JSON.stringify(body.registration),
      }));
    }
    if (body.operation === "accept") {
      return NextResponse.json(await backendRequest(`${path}/aceptar`, { method: "POST" }));
    }
    return NextResponse.json({ message: "Operación inválida." }, { status: 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
