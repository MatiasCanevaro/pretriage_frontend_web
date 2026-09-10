import { NextResponse } from "next/server";
import {
  BackendApiError,
  SERVICE_UNAVAILABLE_ERROR,
} from "@/lib/api/server";

export function apiErrorResponse(error: unknown) {
  if (error instanceof BackendApiError) {
    return NextResponse.json(
      { message: error.message, status: error.status },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { message: SERVICE_UNAVAILABLE_ERROR, status: 500 },
    { status: 500 },
  );
}
