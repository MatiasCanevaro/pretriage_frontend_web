import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
});

const tokenResponseSchema = z.object({
  token: z.string().min(20),
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
      return NextResponse.json(
        { message: "El correo o la contraseña no son correctos." },
        { status: backendResponse.status === 401 ? 401 : 400 },
      );
    }

    const parsed = tokenResponseSchema.safeParse(await backendResponse.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "El backend devolvió una sesión inválida." },
        { status: 502 },
      );
    }

    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: parsed.data.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json(
      { message: "No pudimos conectar con el servidor de PreTriage." },
      { status: 502 },
    );
  }
}
