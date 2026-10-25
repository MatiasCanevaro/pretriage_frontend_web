import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api/route";
import { BackendApiError, backendRequest } from "@/lib/api/server";
import { clearSessionCookies } from "@/lib/session-tokens";

export const dynamic = "force-dynamic";

const passwordChangeSchema = z.object({
  contraseniaActual: z.string().min(1).max(256),
  contraseniaNueva: z.string().min(1).max(256),
});

function noStore(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function POST(request: Request) {
  const parsed = passwordChangeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return noStore(
      NextResponse.json(
        { message: "Revisá los datos ingresados.", status: 400 },
        { status: 400 },
      ),
    );
  }

  try {
    const payload = await backendRequest<unknown>(
      "/api/auth/cambio-contrasenia/actual",
      {
        method: "POST",
        body: JSON.stringify({
          contraseniaActual: parsed.data.contraseniaActual,
          contraseniaNueva: parsed.data.contraseniaNueva,
        }),
      },
    );
    const response = NextResponse.json(payload);
    clearSessionCookies(response);
    return noStore(response);
  } catch (error) {
    const response = apiErrorResponse(error);
    if (error instanceof BackendApiError && error.status === 401) {
      clearSessionCookies(response);
    }
    return noStore(response);
  }
}
