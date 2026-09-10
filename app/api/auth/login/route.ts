import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authTokenResponseSchema,
  setSessionCookies,
} from "@/lib/session-tokens";
import { SERVICE_UNAVAILABLE_ERROR } from "@/lib/api/server";

export const dynamic = "force-dynamic";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  let credentials: z.infer<typeof credentialsSchema>;
  try {
    credentials = credentialsSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { message: "Ingresá un correo y una contraseña válidos." },
      { status: 400 },
    );
  }

  const backendBaseUrl =
    process.env.BACKEND_API_URL?.trim() || "http://localhost:8080";

  try {
    const backendResponse = await fetch(new URL("/api/login", backendBaseUrl), {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!backendResponse.ok) {
      if (backendResponse.status === 429) {
        return NextResponse.json(
          { message: "Realizaste demasiados intentos. Esperá unos minutos y volvé a intentar." },
          { status: 429 },
        );
      }
      if (backendResponse.status !== 400 && backendResponse.status !== 401) {
        return NextResponse.json(
          { message: SERVICE_UNAVAILABLE_ERROR },
          { status: backendResponse.status >= 500 ? 502 : backendResponse.status },
        );
      }
      return NextResponse.json(
        { message: "El correo o la contraseña no son correctos." },
        { status: backendResponse.status === 401 ? 401 : 400 },
      );
    }

    const parsed = authTokenResponseSchema.safeParse(
      await backendResponse.json(),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { message: SERVICE_UNAVAILABLE_ERROR },
        { status: 502 },
      );
    }

    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    setSessionCookies(response, parsed.data);
    return response;
  } catch {
    return NextResponse.json(
      { message: SERVICE_UNAVAILABLE_ERROR },
      { status: 502 },
    );
  }
}
