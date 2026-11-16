// coverage.ts guarda cache em modulo: cada caso precisa reimportar depois de vi.resetModules(),
// por isso o import dinamico (import estatico guardaria o cache entre os testes).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiCoverage } from "@/types/api";

const entry = (over: Partial<ApiCoverage>): ApiCoverage => ({
  sensor: "MODIS",
  minDate: "2000-11-01",
  maxDate: "2026-11-13",
  detections: 115_180_459,
  ...over,
});

describe("coverageFromApi", () => {
  it("usa o período mais largo entre os sensores", async () => {
    const { coverageFromApi, isCovered } = await import("./coverage");
    const cov = coverageFromApi([
      entry({ sensor: "MODIS", minDate: "2000-11-01", maxDate: "2026-11-12" }),
      entry({ sensor: "VIIRS", minDate: "2012-01-20", maxDate: "2026-11-13" }),
    ]);
    expect(cov.minDate).toBe("2000-11-01");
    expect(cov.maxDate).toBe("2026-11-13");
    expect(isCovered(cov, "2005-06-15")).toBe(true);
    expect(isCovered(cov, "2026-11-14")).toBe(false);
    expect(isCovered(cov, "2000-10-31")).toBe(false);
  });


  it("sem cobertura não há resolução nem data", async () => {
    const { coverageFromApi, isCovered } = await import("./coverage");
    const cov = coverageFromApi([]);
    expect(cov).toEqual({ resolutions: [], minDate: null, maxDate: null });
    expect(isCovered(cov, "2026-01-01")).toBe(false);
  });

  it("sensor sem período não quebra a cobertura", async () => {
    const { coverageFromApi } = await import("./coverage");
    const cov = coverageFromApi([
      entry({ sensor: "VIIRS", minDate: null, maxDate: null, detections: 0 }),
      entry({ sensor: "MODIS", minDate: "2024-01-01", maxDate: "2026-11-13" }),
    ]);
    expect(cov.minDate).toBe("2024-01-01");
    expect(cov.maxDate).toBe("2026-11-13");
  });
});

describe("fetchCoverage", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080/api/v2");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("consulta /meta/coverage uma vez e reaproveita a resposta", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify([entry({})])));
    const { fetchCoverage } = await import("./coverage");
    await fetchCoverage();
    await fetchCoverage();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/meta/coverage");
  });

  it("não guarda falha no cache", async () => {
    fetchMock.mockResolvedValueOnce(new Response("x", { status: 503 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([entry({})])));
    const { fetchCoverage } = await import("./coverage");
    await expect(fetchCoverage()).rejects.toBeDefined();
    await expect(fetchCoverage()).resolves.toMatchObject({ minDate: "2000-11-01" });
  });
});
