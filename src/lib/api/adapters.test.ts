import { describe, expect, it } from "vitest";
import type {
  ApiCalendarResponse,
  ApiCompareResponse,
  ApiDetectionsResponse,
  ApiHistoricalResponse,
  ApiRankingResponse,
  ApiTimeseriesResponse,
} from "@/types/api";
import {
  dayCounts,
  dayStatus,
  mergeDetections,
  sensorParam,
  toDetectionsResponse,
  toHexCells,
  toMonthDays,
  toStatsResponse,
} from "./adapters";

const grid: ApiDetectionsResponse = {
  mode: "grid",
  count: 150,
  truncated: false,
  resolution: 3,
  cells: [
    { sensor: "VIIRS", h3: "838141fffffffff", resolution: 3, count: 67, frpSum: 638.78, frpMax: 125.47 },
    { sensor: "MODIS", h3: "838141fffffffff", resolution: 3, count: 14, frpSum: 995.26, frpMax: 330.2 },
    { sensor: "VIIRS", h3: "835f23fffffffff", resolution: 3, count: 69, frpSum: 138.27, frpMax: 25.82 },
  ],
};

describe("sensorParam", () => {
  it("um sensor vira o nome maiúsculo; dois viram BOTH", () => {
    expect(sensorParam(["modis"])).toBe("MODIS");
    expect(sensorParam(["viirs"])).toBe("VIIRS");
    expect(sensorParam(["modis", "viirs"])).toBe("BOTH");
  });
});

describe("mergeDetections", () => {
  const raw = (cells: ApiDetectionsResponse["cells"], resolution: number, truncated = false): ApiDetectionsResponse => ({
    mode: "grid",
    count: 0,
    truncated,
    resolution,
    cells,
  });
  const a = { sensor: "VIIRS" as const, h3: "838141fffffffff", resolution: 3, count: 10, frpSum: 1 };
  const b = { sensor: "MODIS" as const, h3: "838141fffffffff", resolution: 3, count: 4, frpSum: 1 };
  const c = { sensor: "VIIRS" as const, h3: "835f23fffffffff", resolution: 3, count: 7, frpSum: 1 };

  it("não conta duas vezes a célula que aparece em dois blocos vizinhos", () => {
    const merged = mergeDetections([raw([a, b], 4), raw([a, c], 4)]);
    expect(merged.cells).toHaveLength(3);
    expect(merged.count).toBe(21);
  });

  it("usa a menor resolução e marca truncamento se algum bloco truncou", () => {
    const merged = mergeDetections([raw([a], 4), raw([c], 3, true)]);
    expect(merged.resolution).toBe(3);
    expect(merged.truncated).toBe(true);
  });
});

describe("toHexCells", () => {
  const cells = toHexCells(grid.cells!);

  it("junta MODIS e VIIRS da mesma célula e mantém a origem de cada um", () => {
    expect(cells).toHaveLength(2);
    const a = cells.find((c) => c.id === "838141fffffffff")!;
    expect(a).toMatchObject({ res: 3, count: 81, modis: 14, viirs: 67 });
    const b = cells.find((c) => c.id === "835f23fffffffff")!;
    expect(b).toMatchObject({ count: 69, modis: 0, viirs: 69 });
  });

  it("calcula centro [lon, lat] e aresta da célula", () => {
    const [lon, lat] = cells[0].center;
    expect(lat).toBeGreaterThan(-90);
    expect(lat).toBeLessThan(90);
    expect(lon).toBeGreaterThan(-180);
    expect(lon).toBeLessThan(180);
    expect(cells[0].edgeKm).toBeGreaterThan(50);
    expect(cells[0].edgeKm).toBeLessThan(90);
  });
});

describe("toDetectionsResponse", () => {
  const out = toDetectionsResponse(grid);

  it("devolve grade H3 e nenhum ponto individual inventado", () => {
    expect(out.items).toEqual([]);
    expect(out.grid?.resolution).toBe(3);
    expect(out.grid?.cells).toHaveLength(2);
  });

  it("preserva total e truncamento, é dado real e sem harmonização", () => {
    expect(out.total).toBe(150);
    expect(out.truncated).toBe(false);
    expect(out.source.simulated).toBe(false);
    expect(out.harmonization.available).toBe(false);
    expect(toDetectionsResponse({ ...grid, truncated: true }).truncated).toBe(true);
  });

  it("leva junto a resolução mais fina disponível, quando informada", () => {
    expect(toDetectionsResponse(grid, 5).grid?.maxResolution).toBe(5);
    expect(toDetectionsResponse(grid).grid?.maxResolution).toBeUndefined();
  });

  it("resposta vazia vira grade sem células", () => {
    const empty = toDetectionsResponse({
      mode: "grid",
      count: 0,
      truncated: false,
      resolution: 3,
      cells: [],
      message: "Nenhum foco",
    });
    expect(empty.grid?.cells).toEqual([]);
    expect(empty.total).toBe(0);
  });
});

const compare: ApiCompareResponse = {
  start: "2026-10-01",
  end: "2026-10-03",
  sensors: [
    { sensor: "MODIS", detections: 100, daysWithData: 3, frpMean: 30, frpTotal: 3000, confidenceMean: 70, nominalResolutionMeters: 1000 },
    { sensor: "VIIRS", detections: 300, daysWithData: 3, frpMean: 10, frpTotal: 3000, confidence: { low: 1, nominal: 2, high: 3 }, nominalResolutionMeters: 375 },
  ],
};

const point = (
  date: string,
  sensor: "MODIS" | "VIIRS",
  count: number,
  robustZ: number | null,
  unusual: boolean,
) => ({ date, sensor, count, frpSum: 1, robustZ, unusual });

const timeseries: ApiTimeseriesResponse = {
  method: "z-score robusto",
  threshold: 3.5,
  series: [
    point("2026-10-03", "MODIS", 5, 4, true),
    point("2026-10-01", "MODIS", 10, 0, false),
    point("2026-10-02", "MODIS", 9, 1, false),
    point("2026-10-01", "VIIRS", 50, 0.2, false),
    point("2026-10-02", "VIIRS", 400, 5, true),
    point("2026-10-03", "VIIRS", 60, 4.1, true),
  ],
};

describe("toStatsResponse", () => {
  it("junta sensores por dia, em ordem de data", () => {
    const out = toStatsResponse(["modis", "viirs"], compare, timeseries);
    expect(out.series[0]).toEqual({ date: "2026-10-01", modis: 10, viirs: 50 });
    expect(out.series.map((r) => r.date)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(out.bySensor).toEqual({ modis: 100, viirs: 300 });
    expect(out.source.simulated).toBe(false);
  });

  it("FRP médio é a soma de FRP dividida pelas detecções", () => {
    const out = toStatsResponse(["modis", "viirs"], compare, timeseries);
    expect(out.frp).toEqual({ total: 6000, mean: 15, unit: "MW" });
  });

  it("sem sensores no resultado: zero detecções e FRP ausente", () => {
    const out = toStatsResponse(
      ["modis", "viirs"],
      { ...compare, sensors: [] },
      { ...timeseries, series: [] },
    );
    expect(out.bySensor).toEqual({ modis: 0, viirs: 0 });
    expect(out.frp).toBeNull();
    expect(out.series).toEqual([]);
  });

  it("dia fora da cobertura vira null na série, não zero", () => {
    const out = toStatsResponse(
      ["modis"],
      compare,
      {
        ...timeseries,
        series: [
          point("2026-10-01", "MODIS", 0, null, false),
          point("2026-10-02", "MODIS", 0, null, false),
          point("2026-10-03", "MODIS", 8, null, false),
        ],
      },
      { isCovered: (date) => date >= "2026-10-02" },
    );
    expect(out.series).toEqual([
      { date: "2026-10-01", modis: null },
      { date: "2026-10-02", modis: 0 },
      { date: "2026-10-03", modis: 8 },
    ]);
  });

  describe("períodos críticos", () => {
    it("agrupa dias incomuns consecutivos e soma as contagens", () => {
      const out = toStatsResponse(["modis", "viirs"], compare, timeseries);
      expect(out.criticalPeriods?.items).toEqual([
        { label: "Atividade incomum", from: "2026-10-02", to: "2026-10-03", value: 400 + 5 + 60 },
      ]);
      expect(out.criticalPeriods?.criterion).toMatch(/3,5/);
    });

    it("separa períodos não consecutivos", () => {
      const out = toStatsResponse(["viirs"], compare, {
        ...timeseries,
        series: [
          point("2026-10-01", "VIIRS", 90, 4, true),
          point("2026-10-02", "VIIRS", 10, 0, false),
          point("2026-10-03", "VIIRS", 80, 4, true),
        ],
      });
      expect(out.criticalPeriods?.items.map((i) => i.from)).toEqual(["2026-10-01", "2026-10-03"]);
    });

    it("sem z-score (poucos dias) fica indisponível; com z-score e sem dias incomuns, lista vazia", () => {
      const noZ = toStatsResponse(["modis"], compare, {
        ...timeseries,
        series: [point("2026-10-01", "MODIS", 10, null, false)],
      });
      expect(noZ.criticalPeriods).toBeNull();
      const none = toStatsResponse(["modis"], compare, {
        ...timeseries,
        series: [point("2026-10-01", "MODIS", 10, 0.1, false)],
      });
      expect(none.criticalPeriods?.items).toEqual([]);
    });
  });

  describe("ranking", () => {
    const ranking: ApiRankingResponse = {
      metric: "count",
      resolution: 3,
      totalCells: 133,
      criticalPercentile: 95,
      criticalThreshold: 7249,
      items: [
        { rank: 1, h3: "838a91fffffffff", resolution: 3, detections: 61040, frpSum: 1, modisDetections: 5000, viirsDetections: 56040, critical: true },
        { rank: 2, h3: "838060fffffffff", resolution: 3, detections: 100, frpSum: 1, modisDetections: 10, viirsDetections: 90, critical: false },
      ],
    };

    it("lista células na ordem da API e marca as críticas", () => {
      const out = toStatsResponse(["modis"], compare, timeseries, { ranking });
      expect(out.ranking?.items.map((i) => i.value)).toEqual([61040, 100]);
      expect(out.ranking?.items[0].label).toMatch(/região crítica/);
      expect(out.ranking?.items[1].label).not.toMatch(/região crítica/);
      expect(out.ranking?.rule).toMatch(/percentil 95/);
    });

    it("sem itens ou sem resposta fica indisponível", () => {
      expect(
        toStatsResponse(["modis"], compare, timeseries, { ranking: { ...ranking, items: [] } }).ranking,
      ).toBeNull();
      expect(toStatsResponse(["modis"], compare, timeseries).ranking).toBeNull();
    });

    it("sem limiar crítico explica que nenhuma célula foi marcada", () => {
      const out = toStatsResponse(["modis"], compare, timeseries, {
        ranking: { ...ranking, criticalThreshold: null },
      });
      expect(out.ranking?.rule).toMatch(/poucas células/);
    });
  });

  describe("comparação histórica", () => {
    const sensor = (
      s: "MODIS" | "VIIRS",
      perDay: number,
      mean: number | null,
      sufficient: boolean,
      years = 5,
    ) => ({
      sensor: s,
      current: {
        start: "2026-10-01",
        end: "2026-10-31",
        days: 31,
        daysWithData: 31,
        detections: perDay * 31,
        detectionsPerDay: perDay,
      },
      yearsWithData: years,
      meanDetectionsPerDay: mean,
      sufficient,
    });

    it("soma os sensores selecionados e calcula a anomalia", () => {
      const historical: ApiHistoricalResponse = {
        yearsRequested: 5,
        minYears: 3,
        zThreshold: 2,
        sensors: [sensor("MODIS", 100, 80, true, 4), sensor("VIIRS", 900, 1000, true, 5)],
      };
      const out = toStatsResponse(["modis", "viirs"], compare, timeseries, { historical });
      expect(out.history).toMatchObject({
        observed: 1000,
        reference: 1080,
        anomaly: -80,
        unit: "detecções/dia",
      });
      expect(out.history?.referencePeriod).toMatch(/4 anos/);
    });

    it("dado insuficiente em algum sensor deixa a comparação indisponível", () => {
      const historical: ApiHistoricalResponse = {
        yearsRequested: 5,
        minYears: 3,
        zThreshold: 2,
        sensors: [sensor("MODIS", 100, null, false, 0), sensor("VIIRS", 900, 1000, true)],
      };
      expect(
        toStatsResponse(["modis", "viirs"], compare, timeseries, { historical }).history,
      ).toBeNull();
      expect(toStatsResponse(["viirs"], compare, timeseries, { historical }).history).not.toBeNull();
    });
  });
});

describe("calendário", () => {
  const raw: ApiCalendarResponse = {
    month: "2026-10",
    daysWithFire: 1,
    days: [
      { date: "2026-10-11", modis: { count: 0, frpSum: 0 }, viirs: { count: 0, frpSum: 0 } },
      { date: "2026-10-12", modis: { count: 29, frpSum: 1 }, viirs: { count: 85, frpSum: 1 } },
      { date: "2026-10-13", modis: { count: 0, frpSum: 0 }, viirs: { count: 0, frpSum: 0 } },
    ],
  };

  it("distingue atividade, zero registrado e dia sem dados", () => {
    expect(toMonthDays(raw, (d) => d >= "2026-10-12")).toEqual([
      { date: "2026-10-11", status: "unavailable" },
      { date: "2026-10-12", status: "activity", counts: { MODIS: 29, VIIRS: 85 } },
      { date: "2026-10-13", status: "none" },
    ]);
  });

  it("ausência de dados nunca vira 'sem fogo'", () => {
    expect(toMonthDays(raw, () => false).map((d) => d.status)).toEqual([
      "unavailable",
      "activity",
      "unavailable",
    ]);
  });

  it("contagem do dia vem do calendário", () => {
    expect(dayCounts(raw, "2026-10-12")).toEqual({ MODIS: 29, VIIRS: 85 });
    expect(dayCounts(raw, "2026-11-01")).toBeNull();
  });

  it("status do dia", () => {
    expect(dayStatus(3, false)).toBe("activity");
    expect(dayStatus(0, true)).toBe("none");
    expect(dayStatus(0, false)).toBe("unavailable");
  });
});
