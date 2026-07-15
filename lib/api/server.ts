import "server-only";
import { getSession } from "@/lib/session";

const backendBaseUrl = process.env.BACKEND_API_URL ?? "http://localhost:8080";

export class BackendApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "BackendApiError";
  }
}

function safeMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }
  return fallback;
}

export async function backendRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const session = await getSession();
  if (!session) throw new BackendApiError(401, "La sesión expiró.");

  let response: Response;
  try {
    response = await fetch(new URL(path, backendBaseUrl), {
      ...init,
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(60_000),
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new BackendApiError(
        504,
        "La operación tardó demasiado. Podés reintentar sin perder el borrador.",
      );
    }
    throw new BackendApiError(502, "No pudimos conectar con el backend.");
  }

  if (response.status === 204) return null as T;
  const contentType = response.headers.get("content-type") ?? "";
  const payload: unknown = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new BackendApiError(
      response.status,
      safeMessage(payload, "No pudimos completar la operación."),
    );
  }

  return payload as T;
}
