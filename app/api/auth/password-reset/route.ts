import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api/route";
import {
  BackendApiError,
  publicBackendRequest,
  SERVICE_UNAVAILABLE_ERROR,
} from "@/lib/api/server";

export const dynamic = "force-dynamic";

const requestSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("requestToken"),
    email: z.string().trim().email().max(254),
  }),
  z.object({
    operation: z.literal("validateToken"),
    token: z.string().trim().min(1).max(256),
  }),
  z.object({
    operation: z.literal("resetPassword"),
    token: z.string().trim().min(1).max(256),
    newPassword: z.string().min(8).max(72),
  }),
]);

const tokenRequestResponseSchema = z.object({
  mensaje: z.string(),
  tiempoExpiracion: z.string(),
});

const tokenValidationResponseSchema = z.object({
  valido: z.literal(true),
  message: z.string(),
});

const passwordChangeResponseSchema = z.object({ message: z.string() });

function parseBackendResponse<T>(schema: z.ZodType<T>, response: unknown) {
  const parsed = schema.safeParse(response);
  if (!parsed.success) {
    throw new BackendApiError(
      502,
      SERVICE_UNAVAILABLE_ERROR,
    );
  }
  return parsed.data;
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Revisá los datos ingresados.", status: 400 },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.operation === "requestToken") {
      const response = await publicBackendRequest<unknown>(
        "/api/auth/cambio-contrasenia/solicitar-token",
        {
          method: "POST",
          body: JSON.stringify({ email: parsed.data.email }),
        },
      );
      return NextResponse.json(
        parseBackendResponse(tokenRequestResponseSchema, response),
      );
    }

    if (parsed.data.operation === "validateToken") {
      const query = new URLSearchParams({ token: parsed.data.token });
      const response = await publicBackendRequest<unknown>(
        `/api/auth/cambio-contrasenia/validar?${query}`,
      );
      return NextResponse.json(
        parseBackendResponse(tokenValidationResponseSchema, response),
      );
    }

    const response = await publicBackendRequest<unknown>(
      "/api/auth/cambio-contrasenia",
      {
        method: "POST",
        body: JSON.stringify({
          token: parsed.data.token,
          nuevaContrasenia: parsed.data.newPassword,
        }),
      },
    );
    return NextResponse.json(
      parseBackendResponse(passwordChangeResponseSchema, response),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
