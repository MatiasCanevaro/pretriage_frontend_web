import { NextResponse } from "next/server";
import { BackendApiError } from "@/lib/api/server";

export function apiErrorResponse(error: unknown) {
  if (error instanceof BackendApiError) {
    return NextResponse.json(
      { message: error.message, status: error.status },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { message: "Ocurrió un error inesperado.", status: 500 },
    { status: 500 },
  );
}
