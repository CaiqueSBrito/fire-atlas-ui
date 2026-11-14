const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

export const hasApi = Boolean(BASE_URL);

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly recoverable = true,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function problemDetail(res: Response): Promise<string | null> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "detail" in body) {
      const { detail } = body as { detail: unknown };
      return typeof detail === "string" && detail ? detail : null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function apiFetch<T>(
  path: string,
  params: Record<string, string | null | undefined> = {},
  signal?: AbortSignal,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError("Não foi possível conectar ao servidor.");
  }

  if (!res.ok) {
    const detail = res.status < 500 ? await problemDetail(res) : null;
    throw new ApiError(
      detail
        ? `O servidor recusou a consulta: ${detail}.`
        : `O servidor respondeu com erro (${res.status}).`,
      res.status,
      res.status >= 500,
    );
  }
  return (await res.json()) as T;
}
