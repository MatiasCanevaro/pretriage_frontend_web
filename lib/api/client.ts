export class ClientApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

export async function apiClient<T>(
  path: string,
  operation: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation, ...payload }),
  });

  const data = (await response.json()) as
    | T
    | { message?: string; status?: number };
  if (!response.ok) {
    const error = data as { message?: string; status?: number };
    throw new ClientApiError(
      error.status ?? response.status,
      error.message ?? "No pudimos completar la operación.",
    );
  }
  return data as T;
}
