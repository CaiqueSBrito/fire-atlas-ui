import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SOURCES = [
  {
    product: "map_grid",
    sensor: "MODIS,VIIRS",
    sourceKey: "gold/map_grid/resolution=3/year=2026@v313",
    bbox: "global",
    periodStart: "2026-01-01",
    periodEnd: "2026-12-31",
    status: "COMPLETED",
    rowsLoaded: 10,
    minDate: "2026-01-01",
    maxDate: "2026-11-13",
  },
  {
    product: "map_grid",
    sensor: "MODIS,VIIRS",
    sourceKey: "gold/map_grid/resolution=1/year=2026@v313",
    bbox: "global",
    periodStart: "2026-01-01",
    periodEnd: "2026-12-31",
    status: "COMPLETED",
    rowsLoaded: 10,
    minDate: "2026-01-01",
    maxDate: "2026-11-13",
  },
];

const CELLS = [
  { sensor: "VIIRS", h3: "838141fffffffff", resolution: 3, count: 67, frpSum: 10, frpMax: 5 },
  { sensor: "MODIS", h3: "838141fffffffff", resolution: 3, count: 14, frpSum: 20, frpMax: 9 },
];

const ZERO = { count: 0, frpSum: 0 };
const CALENDAR = {
  month: "2026-11",
  daysWithFire: 1,
  days: [
    { date: "2026-11-12", modis: { count: 14, frpSum: 1 }, viirs: { count: 67, frpSum: 1 } },
    { date: "2026-11-13", modis: ZERO, viirs: ZERO },
    { date: "2026-11-14", modis: ZERO, viirs: ZERO },
  ],
};

const fetchMock = vi.fn();
const calls = () => fetchMock.mock.calls.map((c) => new URL(String(c[0])));
const callTo = (path: string) => calls().find((u) => u.pathname.endsWith(path));

function route(url: URL): unknown {
  const path = url.pathname.replace("/api/v1", "");
  switch (path) {
    case "/meta/sources":
      return SOURCES;
    case "/detections":
      return { mode: "grid", count: 81, truncated: false, resolution: 3, cells: CELLS };
    case "/calendar":
      return CALENDAR;
    case "/compare":
      return {
        start: "2026-11-01",
        end: "2026-11-13",
        sensors: [
          { sensor: "MODIS", detections: 14, daysWithData: 1, frpMean: 1, frpTotal: 14, nominalResolutionMeters: 1000 },
        ],
      };
    case "/timeseries":
      return { method: "m", threshold: 3.5, series: [{ date: "2026-11-12", sensor: "MODIS", count: 14, frpSum: 1, unusual: false }] };
    case "/rankings/cells":
      return { metric: "count", resolution: 3, totalCells: 1, criticalPercentile: 95, items: [] };
    case "/compare/historical":
      return { yearsRequested: 5, minYears: 3, zThreshold: 2, sensors: [] };
    default:
      throw new Error(`rota inesperada ${path}`);
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input: URL) => {
    try {
      return new Response(JSON.stringify(route(new URL(String(input)))));
    } catch (e) {
      return new Response(JSON.stringify({ detail: (e as Error).message }), { status: 500 });
    }
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const BRASIL: [number, number, number, number] = [-74, -34, -34, 6];
const query = { sensors: ["modis", "viirs"] as ("modis" | "viirs")[], from: "2026-11-01", to: "2026-11-13", bbox: BRASIL };

describe("detecções pela API gold", () => {
  it("consulta por células H3 (nunca bbox) e pede a resolução mais fina importada", async () => {
    const { fetchDetections } = await import("./detections");
    const out = await fetchDetections(query, null);
    const url = callTo("/detections")!;
    expect(url.searchParams.has("bbox")).toBe(false);
    const cells = url.searchParams.get("cells")!.split(",");
    expect(cells.length).toBeGreaterThan(1);
    expect(cells.length).toBeLessThanOrEqual(380);
    expect(url.searchParams.get("start")).toBe("2026-11-01");
    expect(url.searchParams.get("end")).toBe("2026-11-13");
    expect(url.searchParams.get("sensor")).toBe("BOTH");
    expect(url.searchParams.get("zoom")).toBe("3");
    expect(out.grid?.cells).toHaveLength(1);
    expect(out.grid?.cells[0]).toMatchObject({ count: 81, modis: 14, viirs: 67 });
    expect(out.source.simulated).toBe(false);
  });

  it("um sensor só é repassado como MODIS ou VIIRS", async () => {
    const { fetchDetections } = await import("./detections");
    await fetchDetections({ ...query, sensors: ["viirs"] }, null);
    expect(callTo("/detections")!.searchParams.get("sensor")).toBe("VIIRS");
  });

  it("área grande é consultada em blocos paralelos e somada sem repetir células", async () => {
    const { fetchDetections } = await import("./detections");
    const out = await fetchDetections({ ...query, bbox: [-110, -50, 50, 50] }, null);
    const detectionCalls = calls().filter((u) => u.pathname.endsWith("/detections"));
    expect(detectionCalls.length).toBeGreaterThan(1);
    expect(detectionCalls.length).toBeLessThanOrEqual(12);
    for (const u of detectionCalls) expect(u.href.length).toBeLessThan(8000);
    expect(out.grid?.cells).toHaveLength(1);
    expect(out.total).toBe(81);
  });

  it("a URL cabe no limite de 8 KB do servidor", async () => {
    const { fetchDetections } = await import("./detections");
    await fetchDetections({ ...query, bbox: [-180, -60, 180, 80] }, null);
    expect(String(fetchMock.mock.calls.find((c) => String(c[0]).includes("/detections"))![0]).length).toBeLessThan(8000);
  });
});

describe("estatísticas pela API gold", () => {
  it("monta indicadores, série e as consultas opcionais", async () => {
    const { fetchStats } = await import("./detections");
    const out = await fetchStats(query, null);
    expect(out.bySensor).toEqual({ modis: 14, viirs: 0 });
    expect(out.series).toEqual([{ date: "2026-11-12", modis: 14 }]);
    expect(callTo("/rankings/cells")!.searchParams.get("resolution")).toBe("3");
    expect(callTo("/compare/historical")!.searchParams.get("years")).toBe("5");
    expect(out.history).toBeNull();
  });

  it("falha no ranking ou no histórico não derruba o painel", async () => {
    fetchMock.mockImplementation(async (input: URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/rankings/cells") || url.pathname.endsWith("/compare/historical")) {
        return new Response("x", { status: 500 });
      }
      return new Response(JSON.stringify(route(url)));
    });
    const { fetchStats } = await import("./detections");
    const out = await fetchStats(query, null);
    expect(out.bySensor.modis).toBe(14);
    expect(out.ranking).toBeNull();
    expect(out.history).toBeNull();
  });

  it("falha em /compare é erro do painel (com nova tentativa)", async () => {
    fetchMock.mockImplementation(async (input: URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/compare")) return new Response("x", { status: 503 });
      return new Response(JSON.stringify(route(url)));
    });
    const { fetchStats } = await import("./detections");
    await expect(fetchStats(query, null)).rejects.toMatchObject({ status: 503, recoverable: true });
  });
});

describe("calendário pela API gold", () => {
  it("mês: atividade, zero registrado dentro da cobertura e indisponível depois dela", async () => {
    const { fetchMonth } = await import("./calendar");
    const out = await fetchMonth("2026-11", "brasil");
    expect(out.days).toEqual([
      { date: "2026-11-12", status: "activity", counts: { MODIS: 14, VIIRS: 67 } },
      { date: "2026-11-13", status: "none" },
      { date: "2026-11-14", status: "unavailable" },
    ]);
    const url = callTo("/calendar")!;
    expect(url.searchParams.has("bbox")).toBe(false);
    expect(url.searchParams.get("month")).toBe("2026-11");
    expect(out.source.simulated).toBe(false);
  });

  it("dia: contagem do calendário e grade H3 do dia", async () => {
    const { fetchDay } = await import("./calendar");
    const out = await fetchDay("2026-11-12", "para", "all");
    expect(out.status).toBe("activity");
    expect(out.counts).toEqual({ MODIS: 14, VIIRS: 67 });
    expect(out.detections).toEqual([]);
    expect(out.grid?.resolution).toBe(3);
    const url = callTo("/detections")!;
    expect(url.searchParams.get("start")).toBe("2026-11-12");
    expect(url.searchParams.get("end")).toBe("2026-11-12");
  });

  it("dia depois da cobertura é indisponível, sem contagem", async () => {
    const { fetchDay } = await import("./calendar");
    const out = await fetchDay("2026-11-14", "para", "all");
    expect(out.status).toBe("unavailable");
    expect(out.counts).toBeUndefined();
  });

  it("passagem diurna/noturna não existe na fonte: avisa e não consulta a API", async () => {
    const { fetchDay, PASS_TIME_UNSUPPORTED } = await import("./calendar");
    const out = await fetchDay("2026-11-12", "para", "night");
    expect(out.status).toBe("unavailable");
    expect(out.note).toBe(PASS_TIME_UNSUPPORTED);
    expect(out.detections).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
