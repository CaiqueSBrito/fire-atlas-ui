import { describe, expect, it } from "vitest";
import type { ApiHistoricalResponse, ApiHistoricalSensor } from "@/types/api";
import { toCellHistory } from "./adapters";
import { monthWindow } from "./detections";

const sensor = (s: Partial<ApiHistoricalSensor> & Pick<ApiHistoricalSensor, "sensor">): ApiHistoricalSensor => ({
  current: { start: "2026-11-01", end: "2026-11-13", days: 13, daysWithData: 5, detections: 26, detectionsPerDay: 2 },
  baseline: [],
  yearsWithData: 3,
  meanDetectionsPerDay: 1,
  sufficient: true,
  anomalous: false,
  ...s,
});

const response = (sensors: ApiHistoricalSensor[]): ApiHistoricalResponse => ({
  yearsRequested: 5,
  minYears: 3,
  zThreshold: 2,
  sensors,
});

describe("toCellHistory", () => {
  it("o período é do dia 1 do mês até a data final do filtro", () => {
    expect(monthWindow("2026-11-13")).toEqual({ start: "2026-11-01", end: "2026-11-13" });
  });

  it("soma os sensores selecionados por ano e calcula a variação sobre a média por dia", () => {
    const out = toCellHistory(
      "86814c6dfffffff",
      ["modis", "viirs"],
      response([
        sensor({
          sensor: "MODIS",
          baseline: [{ year: 2024, start: "2024-11-01", end: "2024-11-13", detections: 10, detectionsPerDay: 0.8 }],
        }),
        sensor({
          sensor: "VIIRS",
          anomalous: true,
          baseline: [
            { year: 2024, start: "2024-11-01", end: "2024-11-13", detections: 20, detectionsPerDay: 1.5 },
            { year: 2025, start: "2025-11-01", end: "2025-11-13", detections: 5, detectionsPerDay: 0.4 },
          ],
        }),
      ]),
    )!;
    expect(out.current).toEqual({ year: 2026, detections: 52 });
    expect(out.years).toEqual([
      { year: 2024, detections: 30 },
      { year: 2025, detections: 5 },
    ]);
    expect(out.currentPerDay).toBe(4);
    expect(out.meanPerDay).toBe(2);
    expect(out.changePct).toBe(100);
    expect(out.anomalousSensors).toEqual(["VIIRS"]);
  });

  it("sem anos suficientes não calcula média nem variação e guarda o motivo da API", () => {
    const out = toCellHistory(
      "86814c6dfffffff",
      ["viirs"],
      response([
        sensor({ sensor: "MODIS" }),
        sensor({ sensor: "VIIRS", sufficient: false, yearsWithData: 1, meanDetectionsPerDay: null, note: "dados insuficientes" }),
      ]),
    )!;
    expect(out.sufficient).toBe(false);
    expect(out.meanPerDay).toBeNull();
    expect(out.changePct).toBeNull();
    expect(out.yearsWithData).toBe(1);
    expect(out.notes).toEqual(["VIIRS: dados insuficientes"]);
  });
});
