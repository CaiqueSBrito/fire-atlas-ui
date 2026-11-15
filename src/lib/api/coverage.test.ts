// coverage.ts guarda cache em modulo: cada caso precisa reimportar depois de vi.resetModules(),
// por isso o import dinamico (import estatico guardaria o cache entre os testes).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiSource } from "@/types/api";

const source = (over: Partial<ApiSource>): ApiSource => ({
  product: "map_grid",
  sensor: "MODIS,VIIRS",
  sourceKey: "gold/map_grid/resolution=3/year=2026@v313",
  bbox: "global",
  periodStart: "2026-11-08",
  periodEnd: "2026-11-15",
  status: "COMPLETED",
  error: null,
  rowsLoaded: 10,
  rowsRejected: 0,
  expectedRows: 10,
  verified: true,
  sourceSha256: null,
  minDate: "2026-11-08",
  maxDate: "2026-11-13",
  loadedAt: "2026-11-15T12:00:00Z",
  ...over,
});

const harmonized = (resolution: number, over: Partial<ApiSource> = {}) =>
  source({
    product: "harmonized_cells",
    sourceKey: `gold/harmonized/cells/resolution=${resolution}/year=2026@v7`,
    ...over,
  });

describe("coverageFromSources", () => {
  it("lê resoluções e datas efetivamente carregadas, não o fim declarado da importação", async () => {
    const { coverageFromSources, isCovered } = await import("./coverage");
    const cov = coverageFromSources(
      [
        source({ sourceKey: "gold/map_grid/resolution=0/year=2026@v313" }),
        source({ sourceKey: "gold/map_grid/resolution=3/year=2026@v313" }),
      ],
      "grid",
    );
    expect(cov.resolutions).toEqual([0, 3]);
    expect(cov.minDate).toBe("2026-11-08");
    expect(cov.maxDate).toBe("2026-11-13");
    expect(isCovered(cov, "2026-11-13")).toBe(true);
    expect(isCovered(cov, "2026-11-14")).toBe(false);
    expect(isCovered(cov, "2026-11-07")).toBe(false);
  });

  it("cada tela usa a tabela que consulta: mapa = harmonizada, grade = map_grid", async () => {
    const { coverageFromSources } = await import("./coverage");
    const sources = [
      source({ sourceKey: "gold/map_grid/resolution=4/year=2026@v313" }),
      harmonized(1),
      harmonized(2),
      source({ sourceKey: "gold/h3_places/resolution=5@v2", minDate: null, maxDate: null }),
      source({ sourceKey: "gold/harmonized/availability/year=2026@v7" }),
    ];
    expect(coverageFromSources(sources, "cells").resolutions).toEqual([1, 2]);
    expect(coverageFromSources(sources, "grid").resolutions).toEqual([4]);
  });

  it("ignora importações que falharam ou não carregaram linhas", async () => {
    const { coverageFromSources } = await import("./coverage");
    const cov = coverageFromSources(
      [
        harmonized(5, { status: "FAILED", error: "S3 indisponível", rowsLoaded: 0, minDate: null, maxDate: null }),
        harmonized(6, { rowsLoaded: 0, minDate: null, maxDate: null }),
      ],
      "cells",
    );
    expect(cov).toEqual({ resolutions: [], periods: {}, minDate: null, maxDate: null });
  });

  it("cargas em janelas separadas deixam o intervalo entre elas sem dado", async () => {
    const { coverageFromSources, isCovered } = await import("./coverage");
    const cov = coverageFromSources(
      [
        harmonized(3, { periodStart: "2026-11-08", periodEnd: "2026-11-15", minDate: "2026-11-08", maxDate: "2026-11-14" }),
        harmonized(3, { periodStart: "2026-10-01", periodEnd: "2026-10-07", minDate: "2026-10-01", maxDate: "2026-10-07" }),
      ],
      "cells",
    );
    expect(isCovered(cov, "2026-10-03", 3)).toBe(true);
    expect(isCovered(cov, "2026-10-20", 3)).toBe(false);
    expect(isCovered(cov, "2026-11-10", 3)).toBe(true);
    expect(cov.minDate).toBe("2026-10-01");
    expect(cov.maxDate).toBe("2026-11-14");
  });

  it("a resolução carregada só para os últimos dias não cobre o período mais antigo", async () => {
    const { coverageFromSources, isCovered } = await import("./coverage");
    const cov = coverageFromSources(
      [
        harmonized(6, { periodStart: "2026-11-08", periodEnd: "2026-11-15", minDate: "2026-11-08" }),
        harmonized(3, { periodStart: "2026-10-16", periodEnd: "2026-11-15", minDate: "2026-10-16" }),
      ],
      "cells",
    );
    expect(cov.resolutions).toEqual([3, 6]);
    expect(isCovered(cov, "2026-10-20", 3)).toBe(true);
    expect(isCovered(cov, "2026-10-20", 6)).toBe(false);
  });

  it("reimportar uma janela que voltou vazia apaga a cobertura anterior dela", async () => {
    const { coverageFromSources, isCovered } = await import("./coverage");
    const cov = coverageFromSources(
      [
        harmonized(3, { periodStart: "2026-11-10", periodEnd: "2026-11-15", rowsLoaded: 0, minDate: null, maxDate: null, loadedAt: "2026-11-15T13:00:00Z" }),
        harmonized(3, { periodStart: "2026-11-08", periodEnd: "2026-11-15", minDate: "2026-11-08", maxDate: "2026-11-13" }),
      ],
      "cells",
    );
    expect(isCovered(cov, "2026-11-09", 3)).toBe(true);
    expect(isCovered(cov, "2026-11-11", 3)).toBe(false);
    expect(cov.maxDate).toBe("2026-11-09");
  });

  it("previsão importada aceita a região em qualquer resolução até a da tabela", async () => {
    const { coverageFromSources } = await import("./coverage");
    const sources = [source({ product: "forecast", sourceKey: "gold/forecast/@v12" })];
    expect(coverageFromSources(sources, "forecast").resolutions).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(coverageFromSources([], "forecast").resolutions).toEqual([]);
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

  it("consulta /meta/sources uma vez para todas as tabelas", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify([source({}), harmonized(2)])));
    const { fetchCoverage } = await import("./coverage");
    expect((await fetchCoverage("grid")).resolutions).toEqual([3]);
    expect((await fetchCoverage("cells")).resolutions).toEqual([2]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/meta/sources");
  });

  it("não guarda falha no cache", async () => {
    fetchMock.mockResolvedValueOnce(new Response("x", { status: 500 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([source({})])));
    const { fetchCoverage } = await import("./coverage");
    await expect(fetchCoverage("grid")).rejects.toBeDefined();
    await expect(fetchCoverage("grid")).resolves.toMatchObject({ resolutions: [3] });
  });

  it("sem importação concluída da tabela, a consulta vira o aviso de rodar o script", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify([source({})])));
    const { requireCoverage } = await import("./coverage");
    await expect(requireCoverage("cells")).rejects.toMatchObject({
      name: "NotImportedError",
      recoverable: false,
      message: expect.stringContaining("scripts/atualizar.sh"),
    });
  });
});
