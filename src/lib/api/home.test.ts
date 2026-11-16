import { cellToLatLng } from "h3-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const COVERAGE = [
  { sensor: "MODIS", minDate: "2000-11-01", maxDate: "2026-11-13", detections: 300 },
  { sensor: "VIIRS", minDate: "2012-01-20", maxDate: "2026-11-13", detections: 4700 },
];
let coverage: typeof COVERAGE;
let truncated: boolean;
let cells: Array<{ sensor: string; h3: string; resolution: number; count: number; frpSum: number }>;
const fetchMock = vi.fn();

async function load(withApi = true) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", withApi ? "http://localhost:8080/api/v2" : "");
  return import("./home");
}

beforeEach(() => {
  coverage = COVERAGE;
  truncated = false;
  cells = [
    { sensor: "VIIRS", h3: "82a7a7fffffffff", resolution: 2, count: 50, frpSum: 1 },
    { sensor: "MODIS", h3: "82a7a7fffffffff", resolution: 2, count: 10, frpSum: 1 },
    { sensor: "VIIRS", h3: "8280d7fffffffff", resolution: 2, count: 55, frpSum: 1 },
    { sensor: "VIIRS", h3: "820807fffffffff", resolution: 2, count: 5, frpSum: 1 },
  ];
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input: URL) => {
    const url = new URL(String(input));
    const path = url.pathname.replace("/api/v2", "");
    if (path === "/meta/coverage") return new Response(JSON.stringify(coverage));
    if (path === "/compare") {
      return new Response(JSON.stringify({
        start: url.searchParams.get("start"),
        end: url.searchParams.get("end"),
        sensors: [
          { sensor: "MODIS", detections: 300, frpTotal: 1, daysWithData: 30, nominalResolutionMeters: 1000 },
          { sensor: "VIIRS", detections: 4700, frpTotal: 1, daysWithData: 30, nominalResolutionMeters: 375 },
        ],
      }));
    }
    if (path === "/detections") {
      return new Response(JSON.stringify({ mode: "grid", count: 120, truncated, resolution: 2, cells }));
    }
    throw new Error(`rota inesperada ${path}`);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("fetchHomeSummary", () => {
  it("soma o planeta inteiro nos últimos 30 dias disponíveis pela API existente", async () => {
    const { fetchHomeSummary } = await load();
    expect(await fetchHomeSummary()).toEqual({ from: "2026-10-15", to: "2026-11-13", total: 5000, modis: 300, viirs: 4700 });
    const urls = fetchMock.mock.calls.map((call) => new URL(String(call[0])));
    expect(urls.map((url) => url.pathname)).toEqual(["/api/v2/meta/coverage", "/api/v2/compare"]);
    const url = urls[1];
    expect(url.searchParams.get("cells")!.split(",")).toHaveLength(122);
    expect(url.searchParams.get("start")).toBe("2026-10-15");
    expect(url.searchParams.get("end")).toBe("2026-11-13");
    expect(url.searchParams.get("sensor")).toBe("BOTH");
  });

  it("limita a janela ao período coberto quando há menos de 30 dias", async () => {
    coverage = [{ sensor: "VIIRS", minDate: "2026-11-08", maxDate: "2026-11-13", detections: 4700 }];
    const { fetchHomeSummary } = await load();
    expect(await fetchHomeSummary()).toMatchObject({ from: "2026-11-08", to: "2026-11-13" });
  });

  it("sem cobertura não consulta totais do planeta", async () => {
    coverage = [];
    const { fetchHomeSummary, fetchTopHotspots } = await load();
    expect(await fetchHomeSummary()).toBeNull();
    expect(await fetchTopHotspots()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sem API configurada não consulta nada nem inventa números", async () => {
    const { fetchHomeSummary, fetchTopHotspots } = await load(false);
    expect(await fetchHomeSummary()).toBeNull();
    expect(await fetchTopHotspots()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("não inicia a consulta de totais se a navegação foi cancelada", async () => {
    const { fetchHomeSummary } = await load();
    const controller = new AbortController();
    controller.abort();
    await expect(fetchHomeSummary(controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("fetchTopHotspots", () => {
  it("ordena as células pela soma dos sensores no período recente", async () => {
    const { fetchTopHotspots } = await load();
    expect(await fetchTopHotspots(undefined, 2)).toEqual([
      cellToLatLng("82a7a7fffffffff"),
      cellToLatLng("8280d7fffffffff"),
    ]);
    const url = new URL(String(fetchMock.mock.calls[1][0]));
    expect(url.pathname).toBe("/api/v2/detections");
    expect(url.searchParams.get("start")).toBe("2026-11-07");
    expect(url.searchParams.get("end")).toBe("2026-11-13");
    expect(url.searchParams.get("cells")!.split(",")).toHaveLength(122);
    expect(url.searchParams.get("sensor")).toBe("BOTH");
    expect(url.searchParams.get("zoom")).toBe("3");
  });

  it("não apresenta uma resposta parcial como ranking global", async () => {
    truncated = true;
    const { fetchTopHotspots } = await load();
    expect(await fetchTopHotspots()).toBeNull();
  });

  it("sem células recentes mantém os pontos ilustrativos", async () => {
    cells = [];
    const { fetchTopHotspots } = await load();
    expect(await fetchTopHotspots()).toBeNull();
  });
});
