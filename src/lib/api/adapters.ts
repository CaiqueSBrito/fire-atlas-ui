import { cellToLatLng, getHexagonEdgeLengthAvg } from "h3-js";
import { shiftDate } from "@/lib/utils/dates";
import type { HexCell } from "@/lib/utils/hex";
import type {
  ApiCalendarResponse,
  ApiCell,
  ApiCompareResponse,
  ApiDetectionsResponse,
  ApiHistoricalResponse,
  ApiRankingResponse,
  ApiSensor,
  ApiTimeseriesResponse,
} from "@/types/api";
import type { DayStatus, MonthDay, SensorCounts } from "@/types/calendar";
import type {
  DataOrigin,
  DetectionGrid,
  DetectionsResponse,
  SensorId,
} from "@/types/detections";
import type { SeriesPoint, StatsResponse } from "@/types/stats";

export const API_SOURCE: DataOrigin = {
  name: "NASA FIRMS (MODIS e VIIRS) · camada agregada por célula H3",
  simulated: false,
};

export function sensorParam(sensors: SensorId[]): string {
  if (sensors.length === 1) return sensors[0].toUpperCase();
  return "BOTH";
}

const lower = (sensor: ApiSensor): SensorId =>
  sensor === "MODIS" ? "modis" : "viirs";

export function toHexCells(cells: ApiCell[]): HexCell[] {
  const byId = new Map<string, HexCell>();
  for (const c of cells) {
    let cell = byId.get(c.h3);
    if (!cell) {
      const [lat, lng] = cellToLatLng(c.h3);
      cell = {
        id: c.h3,
        res: c.resolution,
        count: 0,
        modis: 0,
        viirs: 0,
        center: [lng, lat],
        edgeKm: getHexagonEdgeLengthAvg(c.resolution, "km"),
      };
      byId.set(c.h3, cell);
    }
    cell.count += c.count;
    cell[lower(c.sensor)] += c.count;
  }
  return [...byId.values()];
}

export function toDetectionGrid(
  raw: ApiDetectionsResponse,
  maxResolution?: number,
): DetectionGrid {
  return {
    resolution: raw.resolution,
    maxResolution,
    cells: toHexCells(raw.cells ?? []),
  };
}

export function mergeDetections(raws: ApiDetectionsResponse[]): ApiDetectionsResponse {
  const seen = new Set<string>();
  const cells: ApiCell[] = [];
  for (const raw of raws) {
    for (const c of raw.cells ?? []) {
      const key = `${c.sensor}|${c.h3}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cells.push(c);
    }
  }
  return {
    mode: "grid",
    count: cells.reduce((acc, c) => acc + c.count, 0),
    truncated: raws.some((r) => r.truncated),
    resolution: Math.min(...raws.map((r) => r.resolution)),
    cells,
  };
}

export function toDetectionsResponse(
  raw: ApiDetectionsResponse,
  maxResolution?: number,
): DetectionsResponse {
  return {
    items: [],
    grid: toDetectionGrid(raw, maxResolution),
    total: raw.count,
    truncated: raw.truncated,
    harmonization: { available: false },
    source: API_SOURCE,
  };
}

function coordinates(h3: string): string {
  const [lat, lng] = cellToLatLng(h3);
  return `${lat.toFixed(1)}°, ${lng.toFixed(1)}°`;
}

function toRanking(ranking: ApiRankingResponse | null | undefined): StatsResponse["ranking"] {
  if (!ranking || ranking.items.length === 0) return null;
  const threshold =
    ranking.criticalThreshold != null
      ? `região crítica = mais de ${Math.round(ranking.criticalThreshold).toLocaleString("pt-BR")} detecções (percentil ${ranking.criticalPercentile})`
      : "sem região crítica marcada: poucas células com registro no recorte";
  return {
    criterion: `células H3 de resolução ${ranking.resolution} com mais detecções`,
    rule: `ordem decrescente de detecções; ${threshold}`,
    unit: "detecções",
    items: ranking.items.map((i) => ({
      label: `${coordinates(i.h3)} (H3 ${i.h3})${i.critical ? " · região crítica" : ""}`,
      value: i.detections,
    })),
  };
}

function toCriticalPeriods(
  sensors: SensorId[],
  timeseries: ApiTimeseriesResponse,
): StatsResponse["criticalPeriods"] {
  const points = timeseries.series.filter((p) => sensors.includes(lower(p.sensor)));
  if (!points.some((p) => p.robustZ != null)) return null;

  const byDay = new Map<string, number>();
  for (const p of points) {
    if (p.unusual) byDay.set(p.date, (byDay.get(p.date) ?? 0) + p.count);
  }
  const days = [...byDay.keys()].sort();
  const items: NonNullable<StatsResponse["criticalPeriods"]>["items"] = [];
  let start = 0;
  for (let i = 1; i <= days.length; i++) {
    const continues = i < days.length && days[i] === shiftDate(days[i - 1], 1);
    if (continues) continue;
    const run = days.slice(start, i);
    items.push({
      label: "Atividade incomum",
      from: run[0],
      to: run[run.length - 1],
      value: run.reduce((acc, d) => acc + (byDay.get(d) ?? 0), 0),
    });
    start = i;
  }
  return {
    criterion: `dias com contagem diária atípica (z-score robusto acima de ${timeseries.threshold.toLocaleString("pt-BR")}, mediana e MAD do próprio período)`,
    items,
  };
}

function toHistory(
  sensors: SensorId[],
  historical: ApiHistoricalResponse | null | undefined,
): StatsResponse["history"] {
  if (!historical) return null;
  const rows = historical.sensors.filter((s) => sensors.includes(lower(s.sensor)));
  if (
    rows.length === 0 ||
    rows.some((r) => !r.sufficient || r.meanDetectionsPerDay == null)
  ) {
    return null;
  }
  const observed = rows.reduce((acc, r) => acc + r.current.detectionsPerDay, 0);
  const reference = rows.reduce((acc, r) => acc + (r.meanDetectionsPerDay ?? 0), 0);
  const years = Math.min(...rows.map((r) => r.yearsWithData));
  const round = (n: number) => Number(n.toFixed(1));
  return {
    metric: "Detecções por dia no período",
    unit: "detecções/dia",
    observed: round(observed),
    reference: round(reference),
    referencePeriod: `Mesmas datas de ${years} anos anteriores com registro`,
    method: "Média das detecções por dia nas mesmas datas dos anos anteriores",
    anomaly: round(observed - reference),
    anomalyDefinition:
      "Anomalia = observado − média de referência. Valor positivo indica mais detecções por dia que o habitual.",
  };
}

export type StatsExtras = {
  isCovered?: (date: string) => boolean;
  ranking?: ApiRankingResponse | null;
  historical?: ApiHistoricalResponse | null;
};

export function toStatsResponse(
  sensors: SensorId[],
  compare: ApiCompareResponse,
  timeseries: ApiTimeseriesResponse,
  extras: StatsExtras = {},
): StatsResponse {
  const isCovered = extras.isCovered ?? (() => true);

  const bySensor: StatsResponse["bySensor"] = {};
  for (const s of sensors) {
    bySensor[s] =
      compare.sensors.find((c) => lower(c.sensor) === s)?.detections ?? 0;
  }

  const rows = new Map<string, SeriesPoint>();
  for (const p of timeseries.series) {
    if (!sensors.includes(lower(p.sensor))) continue;
    const row = rows.get(p.date) ?? { date: p.date };
    row[lower(p.sensor)] = p.count === 0 && !isCovered(p.date) ? null : p.count;
    rows.set(p.date, row);
  }
  const series = [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));

  const frpTotal = compare.sensors.reduce((acc, c) => acc + c.frpTotal, 0);
  const detections = compare.sensors.reduce((acc, c) => acc + c.detections, 0);

  return {
    bySensor,
    frp: compare.sensors.length
      ? {
          total: frpTotal,
          mean: detections > 0 ? frpTotal / detections : null,
          unit: "MW",
        }
      : null,
    series,
    ranking: toRanking(extras.ranking),
    criticalPeriods: toCriticalPeriods(sensors, timeseries),
    history: toHistory(sensors, extras.historical),
    source: API_SOURCE,
  };
}

function countsOf(day: { modis: { count: number }; viirs: { count: number } }): SensorCounts {
  return { MODIS: day.modis.count, VIIRS: day.viirs.count };
}

export function toMonthDays(
  raw: ApiCalendarResponse,
  isCovered: (date: string) => boolean,
): MonthDay[] {
  return raw.days.map((day) => {
    const counts = countsOf(day);
    if (counts.MODIS! + counts.VIIRS! > 0) {
      return { date: day.date, status: "activity" as DayStatus, counts };
    }
    return { date: day.date, status: isCovered(day.date) ? "none" : "unavailable" };
  });
}

export function dayCounts(
  raw: ApiCalendarResponse,
  date: string,
): SensorCounts | null {
  const day = raw.days.find((d) => d.date === date);
  return day ? countsOf(day) : null;
}

export function dayStatus(total: number, covered: boolean): DayStatus {
  if (total > 0) return "activity";
  return covered ? "none" : "unavailable";
}
