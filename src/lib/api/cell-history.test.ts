import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// As consultas reimportam o cliente após mudar a URL: o módulo captura o ambiente ao carregar.
import type { ApiHistoricalResponse } from "@/types/api";
import { toCellHistory } from "./adapters";

const CELL = "838141fffffffff";
const historical: ApiHistoricalResponse = {
  yearsRequested: 5,
  minYears: 3,
  zThreshold: 2,
  sensors: [
    {
      sensor: "MODIS",
      current: { start: "2026-11-01", end: "2026-11-13", days: 13, daysWithData: 2, detections: 130, detectionsPerDay: 10 },
      baseline: [
        { year: 2025, start: "2025-11-01", end: "2025-11-13", detections: 65, detectionsPerDay: 5 },
        { year: 2023, start: "2023-11-01", end: "2023-11-13", detections: 104, detectionsPerDay: 8 },
        { year: 2024, start: "2024-11-01", end: "2024-11-13", detections: 143, detectionsPerDay: 11 },
      ],
      yearsWithData: 3,
      meanDetectionsPerDay: 8,
      sufficient: true,
      anomalous: false,
    },
    {
      sensor: "VIIRS",
      current: { start: "2026-11-01", end: "2026-11-13", days: 13, daysWithData: 3, detections: 260, detectionsPerDay: 20 },
      baseline: [
        { year: 2023, start: "2023-11-01", end: "2023-11-13", detections: 130, detectionsPerDay: 10 },
        { year: 2024, start: "2024-11-01", end: "2024-11-13", detections: 130, detectionsPerDay: 10 },
        { year: 2025, start: "2025-11-01", end: "2025-11-13", detections: 130, detectionsPerDay: 10 },
      ],
      yearsWithData: 3,
      meanDetectionsPerDay: 10,
      sufficient: true,
      anomalous: true,
    },
  ],
};

describe("toCellHistory", () => {
  it("soma somente os sensores selecionados e ordena os anos com registro", () => {
    const result = toCellHistory(CELL, ["modis", "viirs"], historical)!;
    expect(result.current).toEqual({ year: 2026, detections: 390 });
    expect(result.years).toEqual([
      { year: 2023, detections: 234 },
      { year: 2024, detections: 273 },
      { year: 2025, detections: 195 },
    ]);
    expect(result.currentPerDay).toBe(30);
    expect(result.meanPerDay).toBe(18);
    expect(result.changePct).toBeCloseTo(66.6667);
    expect(result.anomalousSensors).toEqual(["VIIRS"]);
    expect(toCellHistory(CELL, ["modis"], historical)?.current.detections).toBe(130);
  });

  it("preserva anos ausentes e insuficiência, sem inventar uma referência", () => {
    const result = toCellHistory(CELL, ["modis"], {
      ...historical,
      sensors: [{
        ...historical.sensors[0],
        current: { ...historical.sensors[0].current, detections: 0, detectionsPerDay: null },
        baseline: [],
        yearsWithData: 0,
        sufficient: false,
        meanDetectionsPerDay: null,
        note: "Sem registros no período atual",
      }],
    })!;
    expect(result.years).toEqual([]);
    expect(result.currentPerDay).toBe(0);
    expect(result.meanPerDay).toBeNull();
    expect(result.changePct).toBeNull();
    expect(result.sufficient).toBe(false);
    expect(result.notes).toHaveLength(1);
    expect(toCellHistory(CELL, ["viirs"], { ...historical, sensors: [] })).toBeNull();
  });
});

describe("consulta histórica da célula", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080/api/v2");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify(historical)));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("consulta a célula escolhida do início do mês até a data final, sem trocar o produto", async () => {
    const { fetchCellHistory } = await import("./detections");
    const result = await fetchCellHistory(CELL, "2026-11-13", ["modis", "viirs"]);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe("/api/v2/compare/historical");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      cells: CELL,
      start: "2026-11-01",
      end: "2026-11-13",
      sensor: "BOTH",
      years: "5",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result?.cell).toBe(CELL);
    expect(result?.years).toHaveLength(3);
  });

  it("propaga falhas recuperáveis para permitir repetir a consulta", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 503 }));
    const { fetchCellHistory } = await import("./detections");
    await expect(fetchCellHistory(CELL, "2026-11-13", ["viirs"]))
      .rejects.toMatchObject({ status: 503, recoverable: true });
  });

  it("não inicia consulta cancelada", async () => {
    const { fetchCellHistory } = await import("./detections");
    const controller = new AbortController();
    controller.abort();
    await expect(fetchCellHistory(CELL, "2026-11-13", ["modis"], controller.signal))
      .rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
