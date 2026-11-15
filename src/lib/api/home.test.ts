import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const gridImport = (resolution: number, minDate: string, maxDate: string) => ({
  product: "map_grid",
  sensor: "MODIS,VIIRS",
  sourceKey: `gold/map_grid/resolution=${resolution}/year=2026@v313`,
  bbox: "global",
  periodStart: minDate,
  periodEnd: "2026-11-15",
  status: "COMPLETED",
  error: null,
  rowsLoaded: 10,
  rowsRejected: 0,
  expectedRows: 10,
  verified: true,
  sourceSha256: null,
  minDate,
  maxDate,
  loadedAt: "2026-11-15T12:00:00Z",
});

const SOURCES = [gridImport(0, "2026-09-01", "2026-11-13"), gridImport(3, "2026-09-01", "2026-11-13")];
let sources: unknown[] = SOURCES;

const fetchMock = vi.fn();
const calls = () => fetchMock.mock.calls.map((c) => new URL(String(c[0])));

function respond(url: URL) {
  const path = url.pathname.replace("/api/v2", "");
  if (path === "/meta/sources") return sources;
  if (path === "/detections/count") {
    return {
      total: 5000,
      sensors: [
        { sensor: "MODIS", detections: 300, frpSum: 1, daysWithData: 30 },
        { sensor: "VIIRS", detections: 4700, frpSum: 1, daysWithData: 30 },
      ],
    };
  }
  if (path === "/detections") {
    return {
      mode: "grid",
      count: 0,
      truncated: false,
      resolution: 2,
      cells: [
        { sensor: "VIIRS", h3: "82a7a7fffffffff", resolution: 2, count: 50, frpSum: 1 },
        { sensor: "MODIS", h3: "82a7a7fffffffff", resolution: 2, count: 10, frpSum: 1 },
        { sensor: "VIIRS", h3: "8280d7fffffffff", resolution: 2, count: 90, frpSum: 1 },
        { sensor: "VIIRS", h3: "820807fffffffff", resolution: 2, count: 5, frpSum: 1 },
      ],
    };
  }
  throw new Error("rota inesperada " + path);
}

async function load(withApi = true) {
  vi.resetModules();
  if (withApi) vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080/api/v2");
  return import("./home");
}

beforeEach(() => {
  fetchMock.mockReset();
  sources = SOURCES;
  fetchMock.mockImplementation(async (input: URL) => new Response(JSON.stringify(respond(new URL(String(input))))));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("fetchHomeSummary", () => {
  it("soma o planeta inteiro nos últimos 30 dias importados", async () => {
    const { fetchHomeSummary } = await load();
    const out = await fetchHomeSummary();
    expect(out).toEqual({ from: "2026-10-15", to: "2026-11-13", total: 5000, modis: 300, viirs: 4700 });
    const url = calls().find((u) => u.pathname.endsWith("/detections/count"))!;
    expect(url.searchParams.get("cells")!.split(",")).toHaveLength(122);
    expect(url.searchParams.get("start")).toBe("2026-10-15");
    expect(url.searchParams.get("end")).toBe("2026-11-13");
  });

  it("com a janela curta do script, soma só os dias importados", async () => {
    sources = [gridImport(0, "2026-11-08", "2026-11-13")];
    const { fetchHomeSummary } = await load();
    expect(await fetchHomeSummary()).toMatchObject({ from: "2026-11-08", to: "2026-11-13" });
  });

  it("sem a resolução 0 da grade importada, não mostra números do planeta", async () => {
    sources = [gridImport(3, "2026-11-08", "2026-11-13")];
    const { fetchHomeSummary } = await load();
    expect(await fetchHomeSummary()).toBeNull();
    expect(calls().some((u) => u.pathname.endsWith("/detections/count"))).toBe(false);
  });

  it("sem API configurada não consulta nada nem inventa números", async () => {
    const { fetchHomeSummary } = await load(false);
    expect(await fetchHomeSummary()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("fetchTopHotspots", () => {
  it("devolve o centro das células com mais detecções, somando os sensores, da maior para a menor", async () => {
    const { fetchTopHotspots } = await load();
    const out = await fetchTopHotspots(undefined, 2);
    expect(out).toHaveLength(2);
    const url = calls().find((u) => u.pathname.endsWith("/detections"))!;
    expect(url.searchParams.get("start")).toBe("2026-11-07");
    expect(url.searchParams.get("end")).toBe("2026-11-13");
    for (const [lat, lon] of out!) {
      expect(Math.abs(lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(lon)).toBeLessThanOrEqual(180);
    }
  });

  it("sem API usa os pontos ilustrativos (devolve nulo)", async () => {
    const { fetchTopHotspots } = await load(false);
    expect(await fetchTopHotspots()).toBeNull();
  });
});
