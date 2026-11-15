const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

const TIMEOUT_MS = 20_000;

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
  // Uma consulta pode ficar aguardando a cobertura compartilhada quando o usuário muda de região.
  signal?.throwIfAborted();
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  url.searchParams.sort();

  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const merged = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    // Sem no-store: mantém a política Cache-Control da API e o cache HTTP do navegador.
    const res = await fetch(url, { signal: merged });
    if (!res.ok) {
      const detail = await problemDetail(res);
      merged.throwIfAborted();
      const recoverable = res.status === 408 || res.status === 429 || (res.status >= 500 && res.status !== 501);
      throw new ApiError(
        detail
          ? `${recoverable ? "O servidor não concluiu a consulta" : "O servidor recusou a consulta"}: ${detail}`
          : `O servidor respondeu com erro (${res.status}).`,
        res.status,
        recoverable,
      );
    }
    // O teto também cobre uma resposta cujo cabeçalho chegou, mas cujo corpo ainda está sendo transferido.
    return (await res.json()) as T;
  } catch (error) {
    if (signal?.aborted) throw signal.reason;
    if (timeout.aborted) {
      throw new ApiError(
        `A consulta ultrapassou ${TIMEOUT_MS / 1000} s. Reduza o período ou a área e tente novamente.`,
        408,
      );
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError("Não foi possível conectar ao servidor.");
  }
}
