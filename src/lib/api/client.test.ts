// O cliente captura NEXT_PUBLIC_API_URL ao carregar: reimporta após vi.resetModules para isolar o ambiente.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

async function loadClient() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080/api/v2/");
  return import("./client");
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {

  it("mostra o motivo quando o servidor recusa a consulta (400)", async () => {
    const { apiFetch } = await loadClient();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "periodo maximo para esta consulta: 366 dias" }), {
        status: 400,
      }),
    );
    await expect(apiFetch("/detections")).rejects.toMatchObject({
      status: 400,
      recoverable: false,
    });
  });

  it.each([
    [400, false], [404, false], [501, false], [503, true], [429, true],
  ])("status %s tem recoverable=%s", async (status, recoverable) => {
    const { apiFetch } = await loadClient();
    fetchMock.mockResolvedValue(new Response("x", { status }));
    await expect(apiFetch("/detections")).rejects.toMatchObject({ status, recoverable });
  });

  it("falha de rede vira ApiError recuperável", async () => {
    const { apiFetch } = await loadClient();
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiFetch("/detections")).rejects.toMatchObject({
      recoverable: true,
    });
  });

  it("preserva o motivo RFC 7807 do 503 para o usuário", async () => {
    const { apiFetch } = await loadClient();
    const detail = "Fonte temporariamente indisponível.";
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail }), { status: 503 }));
    await expect(apiFetch("/forecast")).rejects.toMatchObject({
      message: expect.stringContaining(detail), status: 503, recoverable: true,
    });
  });

  it("cancelar uma consulta antiga interrompe o fetch, sem virar erro recuperável", async () => {
    const { apiFetch } = await loadClient();
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url, { signal }) =>
        new Promise<Response>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        }),
    );
    const result = apiFetch("/detections", {}, controller.signal);
    controller.abort();
    await expect(result).rejects.toBe(controller.signal.reason);
  });

  it("uma consulta cancelada enquanto aguardava cobertura não dispara outro fetch", async () => {
    const { apiFetch } = await loadClient();
    const controller = new AbortController();
    controller.abort();
    await expect(apiFetch("/detections", {}, controller.signal)).rejects.toBe(controller.signal.reason);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("o timeout também interrompe a leitura do corpo depois do cabeçalho", async () => {
    const { apiFetch } = await loadClient();
    const timeout = new AbortController();
    const spy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
    fetchMock.mockImplementation(async (_url, { signal }) => new Response(new ReadableStream({
      start(stream) {
        signal.addEventListener("abort", () => stream.error(signal.reason), { once: true });
        queueMicrotask(() => timeout.abort(new DOMException("Timeout", "TimeoutError")));
      },
    })));
    try {
      await expect(apiFetch("/detections")).rejects.toMatchObject({ status: 408, recoverable: true });
    } finally {
      spy.mockRestore();
    }
  });
});
