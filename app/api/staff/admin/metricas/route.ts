import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api/route";
import { BackendApiError, backendRequest } from "@/lib/api/server";

const querySchema = z.object({
  hospitalId: z.coerce
    .number()
    .int()
    .gt(0)
    .max(Number.MAX_SAFE_INTEGER),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha inicial no es válida."),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha final no es válida."),
});

export async function GET(request: Request) {
  try {
    const params = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const path = `/api/admin/hospitales/${params.hospitalId}/metricas?desde=${params.desde}&hasta=${params.hasta}`;
    return NextResponse.json(await backendRequest(path));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Revisá el hospital y las fechas indicadas." }, { status: 400 });
    }
    if (error instanceof BackendApiError && error.status === 504) {
      return NextResponse.json(
        { message: "La operación tardó demasiado. Reintentá la consulta.", status: 504 },
        { status: 504 },
      );
    }
    return apiErrorResponse(error);
  }
}
