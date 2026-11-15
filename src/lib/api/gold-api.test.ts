// Os módulos capturam a URL e a cobertura em memória: reimporta após vi.resetModules para isolar cada cenário.
import { getResolution } from "h3-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const imported = (sourceKey: string, product: string) => ({
  product,
  sensor: "MODIS,VIIRS",
  sourceKey,
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
});

const SOURCES = [
  imported("gold/map_grid/resolution=1/year=2026@v313", "map_grid"),
  imported("gold/map_grid/resolution=3/year=2026@v313", "map_grid"),
  imported("gold/harmonized/cells/resolution=2/year=2026@v7", "harmonized_cells"),
  imported("gold/harmonized/cells/resolution=4/year=2026@v7", "harmonized_cells"),
  imported("gold/forecast/@v12", "forecast"),
];

let sources: unknown[] = SOURCES;

const ACTIVITY_CELLS = [
  {
    h3: "848141fffffffff",
    resolution: 4,
    harmonized: 12.5,
    contributing: 3,
    daysWithData: 5,
    modisDetections: 14,
    viirsDetections: 67,
  },
];

const CELLS = [
  { sensor: "VIIRS", h3: "838141fffffffff", resolution: 3, count: 67, frpSum: 10, frpMax: 5 },
  { sensor: "MODIS", h3: "838141fffffffff", resolution: 3, count: 14, frpSum: 20, frpMax: 9 },
];

const bin = (key: string, fromK: number | null, toK: number | null, harmonized: number) => ({
  key,
  ...(fromK === null ? {} : { fromK }),
  ...(toK === null ? {} : { toK }),
  harmonized,
});
const ACTIVITY_CALENDAR = {
  month: "2026-11",
  daysWithData: 2,
  days: [
    {
      date: "2026-11-12", harmonized: 817.7, contributing: 2, hasData: true, basis: "viirs",
      temperature: [
        bin("lt320", null, 320, 40), bin("320", 320, 330, 150), bin("330", 330, 340, 300), bin("340", 340, 350, 200),
        bin("350", 350, 360, 80), bin("ge360", 360, null, 40), bin("none", null, null, 7.7),
      ],
    },
    { date: "2026-11-13", harmonized: 0, contributing: 2, hasData: true, basis: "viirs", temperature: null },
    { date: "2026-11-14", harmonized: null, contributing: 0, hasData: false, basis: null, temperature: null },
  ],
  meta: { unitLabelPt: "Atividade de fogo harmonizada (células ativas equivalentes ao MODIS Aqua)", warnings: [] },
};

const fetchMock = vi.fn();
const calls = () => fetchMock.mock.calls.map((c) => new URL(String(c[0])));
const callTo = (path: string) => calls().find((u) => u.pathname.endsWith(path));

function route(url: URL): unknown {
  const path = url.pathname.replace("/api/v2", "");
  switch (path) {
    case "/meta/sources":
      return sources;
    case "/detections":
      return { mode: "grid", count: 81, truncated: false, resolution: 3, cells: CELLS };
    case "/activity/calendar":
      return ACTIVITY_CALENDAR;
    case "/activity/cells":
      return {
        resolution: 4,
        count: 1,
        truncated: false,
        total: 12.5,
        cells: ACTIVITY_CELLS,
        meta: { unitLabelPt: "Atividade de fogo harmonizada (células ativas equivalentes ao MODIS Aqua)" },
      };
    case "/activity/anomaly":
      return {
        month: "2026-11", current: 817.7, currentDaysWithData: 2, currentMonthComplete: false, baseline: [],
        yearsWithData: 0, minYears: 3, baselineMedian: null, ratioToMedian: null, deviationPct: null,
        sufficient: false, note: "dados insuficientes",
      };
    case "/activity/availability":
      return {
        start: "2026-11-12", end: "2026-11-12", count: 4,
        days: [
          { date: "2026-11-12", platform: "Aqua", units: 1, typicalUnits: 1, available: true, contributes: false },
          { date: "2026-11-12", platform: "NOAA-20", units: 1, typicalUnits: 1, available: true, contributes: true },
          { date: "2026-11-12", platform: "NOAA-21", units: 1, typicalUnits: 1, available: true, contributes: true },
          { date: "2026-11-12", platform: "Terra", units: 0, typicalUnits: 1, available: false, contributes: false },
        ],
      };
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
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080/api/v2");
  vi.stubGlobal("fetch", fetchMock);
  sources = SOURCES;
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

describe("mapa pela API gold (atividade harmonizada por célula)", () => {
  it("consulta /activity/cells por células H3 (nunca bbox) nas resoluções importadas da gold harmonizada", async () => {
    const { fetchDetections } = await import("./detections");
    const out = await fetchDetections(query, null);
    const url = callTo("/activity/cells")!;
    expect(callTo("/detections")).toBeUndefined();
    expect(url.searchParams.has("bbox")).toBe(false);
    const cells = url.searchParams.get("cells")!.split(",");
    expect(cells.length).toBeGreaterThan(1);
    expect(cells.length).toBeLessThanOrEqual(380);
    expect(new Set(cells.map(getResolution))).toEqual(new Set([2]));
    expect(url.searchParams.get("start")).toBe("2026-11-01");
    expect(url.searchParams.get("end")).toBe("2026-11-13");
    expect(url.searchParams.get("zoom")).toBe("4");
    expect(out.grid?.cells).toHaveLength(1);
    expect(out.grid?.cells[0]).toMatchObject({ count: 12.5, modis: 14, viirs: 67, res: 4 });
    expect(out.grid?.harmonized?.unitLabel).toMatch(/equivalentes ao MODIS Aqua/);
    expect(out.source.simulated).toBe(false);
  });

  it("o valor harmonizado já junta os sensores: o filtro de sensor não é enviado", async () => {
    const { fetchDetections } = await import("./detections");
    await fetchDetections({ ...query, sensors: ["viirs"] }, null);
    expect(callTo("/activity/cells")!.searchParams.has("sensor")).toBe(false);
  });

  it("área grande é consultada em blocos paralelos e unida sem repetir células", async () => {
    const { fetchDetections } = await import("./detections");
    const out = await fetchDetections({ ...query, bbox: [-110, -50, 50, 50] }, null);
    const cellCalls = calls().filter((u) => u.pathname.endsWith("/activity/cells"));
    expect(cellCalls.length).toBeGreaterThan(1);
    expect(cellCalls.length).toBeLessThanOrEqual(12);
    for (const u of cellCalls) expect(u.href.length).toBeLessThan(8000);
    expect(out.grid?.cells).toHaveLength(1);
    expect(out.total).toBe(12.5);
  });

  it("a URL cabe no limite de 8 KB do servidor", async () => {
    const { fetchDetections } = await import("./detections");
    await fetchDetections({ ...query, bbox: [-180, -60, 180, 80] }, null);
    expect(String(fetchMock.mock.calls.find((c) => String(c[0]).includes("/activity/cells"))![0]).length).toBeLessThan(8000);
  });

  it("sem importação da gold harmonizada o mapa avisa para rodar o script, sem consultar /activity/cells", async () => {
    sources = SOURCES.filter((s) => !s.sourceKey.startsWith("gold/harmonized/"));
    const { fetchDetections } = await import("./detections");
    await expect(fetchDetections(query, null)).rejects.toMatchObject({
      name: "NotImportedError",
      recoverable: false,
      message: expect.stringContaining("scripts/atualizar.sh"),
    });
    expect(callTo("/activity/cells")).toBeUndefined();
  });
});

describe("estatísticas pela API gold", () => {
  it("monta indicadores, série e as consultas opcionais pelas resoluções importadas da map_grid", async () => {
    const { fetchStats } = await import("./detections");
    const out = await fetchStats(query, null);
    expect(out.bySensor).toEqual({ modis: 14, viirs: 0 });
    expect(out.series).toEqual([{ date: "2026-11-12", modis: 14 }]);
    expect(out.history).toBeNull();
    const cells = callTo("/compare")!.searchParams.get("cells")!.split(",");
    expect(new Set(cells.map(getResolution))).toEqual(new Set([1]));
    expect(callTo("/rankings/cells")!.searchParams.get("resolution")).toBe("3");
  });

  it("dia zerado fora do período importado vira sem dado, não zero", async () => {
    fetchMock.mockImplementation(async (input: URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/timeseries")) {
        return new Response(
          JSON.stringify({
            method: "m",
            threshold: 3.5,
            series: [
              { date: "2026-11-01", sensor: "MODIS", count: 0, frpSum: 0, unusual: false },
              { date: "2026-11-09", sensor: "MODIS", count: 0, frpSum: 0, unusual: false },
            ],
          }),
        );
      }
      return new Response(JSON.stringify(route(url)));
    });
    const { fetchStats } = await import("./detections");
    const out = await fetchStats(query, null);
    expect(out.series).toEqual([
      { date: "2026-11-01", modis: null },
      { date: "2026-11-09", modis: 0 },
    ]);
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

describe("calendário harmonizado pela API gold", () => {
  it("continente vai por nome, sem células, e o dia sem dado não vira zero", async () => {
    const { fetchActivityMonth } = await import("./activity");
    const out = await fetchActivityMonth("2026-11", "south-america");
    const url = callTo("/activity/calendar")!;
    expect(url.searchParams.get("continent")).toBe("South America");
    expect(url.searchParams.has("cells")).toBe(false);
    expect(url.searchParams.get("month")).toBe("2026-11");
    expect(out.days.map((d) => [d.date, d.status, d.value])).toEqual([
      ["2026-11-12", "activity", 817.7],
      ["2026-11-13", "none", 0],
      ["2026-11-14", "unavailable", null],
    ]);
    expect(out.unitLabel).toBe(ACTIVITY_CALENDAR.meta.unitLabelPt);
    expect(out.source.simulated).toBe(false);
  });

  it("as faixas de temperatura vêm da API e somam o valor do dia", async () => {
    const { fetchActivityMonth } = await import("./activity");
    const [day] = (await fetchActivityMonth("2026-11", "south-america")).days;
    expect(day.basis).toBe("viirs");
    expect(day.temperature!.map((b) => b.key)).toEqual(["lt320", "320", "330", "340", "350", "ge360", "none"]);
    expect(day.temperature!.reduce((s, b) => s + b.value, 0)).toBeCloseTo(817.7);
    expect(day.temperature!.map((b) => [b.fromK, b.toK])).toEqual([
      [null, 320], [320, 330], [330, 340], [340, 350], [350, 360], [360, null], [null, null],
    ]);
  });

  it("Brasil vai por país e estados por células H3", async () => {
    const { fetchActivityMonth } = await import("./activity");
    await fetchActivityMonth("2026-11", "brasil");
    expect(callTo("/activity/calendar")!.searchParams.get("country")).toBe("BR");
    fetchMock.mockClear();
    await fetchActivityMonth("2026-11", "para");
    const url = callTo("/activity/calendar")!;
    expect(url.searchParams.get("cells")!.split(",").length).toBeGreaterThan(0);
    expect(url.searchParams.has("bbox")).toBe(false);
  });

  it("estados vão por células nas resoluções importadas da gold harmonizada", async () => {
    const { fetchActivityMonth } = await import("./activity");
    await fetchActivityMonth("2026-11", "para");
    const cells = callTo("/activity/calendar")!.searchParams.get("cells")!.split(",");
    expect(cells.every((c) => [2, 4].includes(getResolution(c)))).toBe(true);
  });

  it("sem importação da gold harmonizada o calendário avisa para rodar o script", async () => {
    sources = SOURCES.filter((s) => !s.sourceKey.startsWith("gold/harmonized/cells/"));
    const { fetchActivityMonth } = await import("./activity");
    await expect(fetchActivityMonth("2026-11", "south-america")).rejects.toMatchObject({
      name: "NotImportedError",
      message: expect.stringContaining("scripts/atualizar.sh"),
    });
    expect(callTo("/activity/calendar")).toBeUndefined();
  });

  it("anomalia sem anos suficientes fica indisponível", async () => {
    const { fetchMonthAnomaly } = await import("./activity");
    const out = await fetchMonthAnomaly("2026-11", "south-america");
    expect(callTo("/activity/anomaly")!.searchParams.get("years")).toBe("5");
    expect(out).toMatchObject({ sufficient: false, deviationPct: null, yearsWithData: 0, minYears: 3 });
  });

  it("satélites do dia: só os que contribuíram com a série", async () => {
    const { fetchDaySatellites } = await import("./activity");
    const out = await fetchDaySatellites("2026-11-12");
    expect(out.contributing).toEqual(["NOAA-20", "NOAA-21"]);
    expect(out.available).toEqual(["Aqua", "NOAA-20", "NOAA-21"]);
  });
});

describe("atividade harmonizada mensal (Análises)", () => {
  it("pede os 12 meses até o fim do período, por continente, e não inventa mês sem dado", async () => {
    fetchMock.mockImplementation(async (input: URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/activity/monthly")) {
        return new Response(
          JSON.stringify({
            months: [
              { month: "2026-10", harmonized: 0, daysWithData: 0, daysInMonth: 31, complete: true },
              { month: "2026-11", harmonized: 50.5, daysWithData: 13, daysInMonth: 30, complete: false },
            ],
            meta: { unitLabelPt: "Atividade de fogo harmonizada (células ativas equivalentes ao MODIS Aqua)", warnings: [] },
          }),
        );
      }
      return new Response(JSON.stringify(route(url)));
    });
    const { fetchHarmonizedMonthly } = await import("./activity");
    const out = await fetchHarmonizedMonthly({ regionId: "south-america", bbox: BRASIL, customArea: false, to: "2026-11-13" });
    const url = callTo("/activity/monthly")!;
    expect(url.searchParams.get("continent")).toBe("South America");
    expect(url.searchParams.get("start")).toBe("2025-12");
    expect(url.searchParams.get("end")).toBe("2026-11");
    expect(out!.months.map((m) => m.value)).toEqual([null, 50.5]);
    expect(out!.unitLabel).toMatch(/MODIS Aqua/);
  });

  it("área personalizada vai por células H3", async () => {
    const { fetchHarmonizedMonthly } = await import("./activity");
    fetchMock.mockImplementation(async (input: URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/activity/monthly")) return new Response(JSON.stringify({ months: [] }));
      return new Response(JSON.stringify(route(url)));
    });
    await fetchHarmonizedMonthly({ regionId: "world", bbox: [-50, -15, -45, -10], customArea: true, to: "2026-11-13" });
    expect(callTo("/activity/monthly")!.searchParams.get("cells")).toBeTruthy();
  });
});

describe("previsão pela API gold", () => {
  it("sem importação da previsão fica indisponível com o aviso do script", async () => {
    sources = SOURCES.filter((s) => !s.sourceKey.startsWith("gold/forecast/"));
    const { fetchForecast } = await import("./forecast");
    const out = await fetchForecast(BRASIL);
    expect(out.status).toBe("unavailable");
    expect(out.status === "unavailable" && out.reason).toMatch(/scripts\/atualizar\.sh/);
    expect(callTo("/forecast")).toBeUndefined();
  });
});
