import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

async function loadClient() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080/api/v1/");
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
  it("mantém o prefixo /api/v1 e envia os parâmetros", async () => {
    const { apiFetch, hasApi } = await loadClient();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    await apiFetch("/detections", { bbox: "-74,-34,-34,6", sensor: "BOTH", vazio: null });
    expect(hasApi).toBe(true);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toBe("http://localhost:8080/api/v1/detections?bbox=-74%2C-34%2C-34%2C6&sensor=BOTH");
  });

  it("mostra o motivo quando o servidor recusa a consulta (400)", async () => {
    const { apiFetch } = await loadClient();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "periodo maximo para esta consulta: 366 dias" }), {
        status: 400,
      }),
    );
    await expect(apiFetch("/detections")).rejects.toMatchObject({
      message: "O servidor recusou a consulta: periodo maximo para esta consulta: 366 dias.",
      status: 400,
      recoverable: false,
    });
  });

  it("erro 5xx é recuperável (permite nova tentativa)", async () => {
    const { apiFetch } = await loadClient();
    fetchMock.mockResolvedValue(new Response("x", { status: 503 }));
    await expect(apiFetch("/detections")).rejects.toMatchObject({
      status: 503,
      recoverable: true,
    });
  });

  it("falha de rede vira ApiError recuperável", async () => {
    const { apiFetch } = await loadClient();
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiFetch("/detections")).rejects.toMatchObject({
      message: "Não foi possível conectar ao servidor.",
      recoverable: true,
    });
  });
});
