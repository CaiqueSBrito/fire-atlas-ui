import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiSource } from "@/types/api";

const source = (over: Partial<ApiSource>): ApiSource => ({
  product: "map_grid",
  sensor: "MODIS,VIIRS",
  sourceKey: "gold/map_grid/resolution=3/year=2026@v313",
  bbox: "global",
  periodStart: "2026-01-01",
  periodEnd: "2026-12-31",
  status: "COMPLETED",
  rowsLoaded: 10,
  verified: true,
  minDate: "2026-01-01",
  maxDate: "2026-11-13",
  ...over,
});

describe("coverageFromSources", () => {
  it("lê resoluções e datas reais, não o fim declarado da importação", async () => {
    const { coverageFromSources, isCovered } = await import("./coverage");
    const cov = coverageFromSources([
      source({ sourceKey: "gold/map_grid/resolution=0/year=2026@v313" }),
      source({ sourceKey: "gold/map_grid/resolution=3/year=2026@v313" }),
      source({
        sourceKey: "gold/map_grid/resolution=1/year=2025@v313",
        minDate: "2025-01-01",
        maxDate: "2025-12-31",
      }),
    ]);
    expect(cov.resolutions).toEqual([0, 1, 3]);
    expect(cov.minDate).toBe("2025-01-01");
    expect(cov.maxDate).toBe("2026-11-13");
    expect(isCovered(cov, "2026-11-13")).toBe(true);
    expect(isCovered(cov, "2026-11-14")).toBe(false);
    expect(isCovered(cov, "2024-12-31")).toBe(false);
  });

  it("considera só a grade do mapa: previsão, lugares e atividade harmonizada não contam", async () => {
    const { coverageFromSources, isCovered } = await import("./coverage");
    const cov = coverageFromSources([
      source({ sourceKey: "gold/map_grid/resolution=3/year=2026@v313" }),
      source({ sourceKey: "gold/harmonized/cells/resolution=6/year=2000@v1", minDate: "2000-11-01", maxDate: "2000-12-31" }),
      source({ sourceKey: "gold/forecast/year=2026@v1", minDate: "2026-11-14", maxDate: "2026-11-21" }),
      source({ sourceKey: "gold/h3_places/@v1", minDate: null, maxDate: null }),
    ]);
    expect(cov.resolutions).toEqual([3]);
    expect(cov.minDate).toBe("2026-01-01");
    expect(cov.maxDate).toBe("2026-11-13");
    expect(isCovered(cov, "2000-12-01")).toBe(false);
    expect(isCovered(cov, "2026-11-18")).toBe(false);
  });

  it("ignora importações que não terminaram", async () => {
    const { coverageFromSources } = await import("./coverage");
    const cov = coverageFromSources([source({ status: "FAILED" })]);
    expect(cov).toEqual({ resolutions: [], minDate: null, maxDate: null });
  });

  it("sem importações nada é considerado coberto", async () => {
    const { coverageFromSources, isCovered } = await import("./coverage");
    expect(isCovered(coverageFromSources([]), "2026-01-01")).toBe(false);
  });
});

describe("fetchCoverage", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080/api/v1");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("reaproveita a resposta por um minuto", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify([source({})])));
    const { fetchCoverage } = await import("./coverage");
    await fetchCoverage();
    await fetchCoverage();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("não guarda falha no cache", async () => {
    fetchMock.mockResolvedValueOnce(new Response("x", { status: 503 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([source({})])));
    const { fetchCoverage } = await import("./coverage");
    await expect(fetchCoverage()).rejects.toBeDefined();
    await expect(fetchCoverage()).resolves.toMatchObject({ resolutions: [3] });
  });
});
