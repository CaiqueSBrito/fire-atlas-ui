const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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

export async function apiFetch<T>(
  path: string,
  params: Record<string, string | null | undefined> = {},
  signal?: AbortSignal,
): Promise<T> {
  const url = new URL(path, BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor.");
  }

  if (!res.ok) {
    throw new ApiError(
      `O servidor respondeu com erro (${res.status}).`,
      res.status,
      res.status >= 500,
    );
  }
  return (await res.json()) as T;
}
