import { cellToLatLng, getHexagonEdgeLengthAvg } from "h3-js";
import { shiftDate } from "@/lib/utils/dates";
import { englishApiMessage } from "./english-message";
import type { HexCell } from "@/lib/utils/hex";
import type {
  ApiActivityAnomalyResponse,
  ApiActivityAvailabilityResponse,
  ApiActivityDay,
  ApiCell,
  ApiCompareResponse,
  ApiDetectionsResponse,
  ApiForecastItem,
  ApiForecastResponse,
  ApiHistoricalResponse,
  ApiRankingResponse,
  ApiSensor,
  ApiTimeseriesResponse,
} from "@/types/api";
import type {
  ActivityDay,
  DaySatellites,
  DayStatus,
  MonthAnomaly,
  TemperatureBasis,
  TemperatureBin,
} from "@/types/calendar";
import type {
  DataOrigin,
  DetectionGrid,
  DetectionsResponse,
  SensorId,
} from "@/types/detections";
import type { ForecastCell, ForecastResponse } from "@/types/forecast";
import type { CellHistory, SeriesPoint, StatsResponse } from "@/types/stats";

export const API_SOURCE: DataOrigin = {
  name: "NASA FIRMS (MODIS and VIIRS) · aggregated H3 cell layer",
  simulated: false,
};

export function sensorParam(sensors: SensorId[]): string {
  if (sensors.length === 1) return sensors[0].toUpperCase();
  return "BOTH";
}

function toForecastCell(item: ApiForecastItem): ForecastCell {
  const [lat, lon] = cellToLatLng(item.h3);
  return {
    id: item.h3,
    lat,
    lon,
    probability: item.probability7d,
    detections24h: item.detections24h ?? null,
    detections7d: item.detections7d ?? null,
    frpMean7d: item.frpMean7d ?? null,
    active: item.active ?? null,
    country: item.countryName ?? null,
    city: item.cityName ?? null,
    cityDistanceKm: item.cityDistanceKm ?? null,
  };
}

export function toForecastResponse(raw: ApiForecastResponse): ForecastResponse {
  if (!raw.issueDate || !raw.summary) {
    return {
      status: "unavailable",
      reason: raw.message ? englishApiMessage(raw.message) : "No forecasts have been imported into the service.",
    };
  }
  return {
    status: "available",
    issueDate: raw.issueDate,
    summary: {
      cells: raw.summary.cells,
      activeCells: raw.summary.activeCells,
      maxProbability: raw.summary.maxProbability ?? null,
      meanProbability: raw.summary.meanProbability ?? null,
    },
    cells: raw.items.map(toForecastCell),
    truncated: raw.truncated,
    source: englishApiMessage(raw.source),
    method: englishApiMessage(raw.method),
  };
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
      ? `critical region = more than ${Math.round(ranking.criticalThreshold).toLocaleString("en-US")} detections (percentile ${ranking.criticalPercentile})`
      : "no critical regions marked: too few cells with records in the selected area";
  return {
    criterion: `H3 cells at resolution ${ranking.resolution} with the most detections`,
    rule: `descending detection count; ${threshold}`,
    unit: "detections",
    items: ranking.items.map((i) => ({
      h3: i.h3,
      label: `${coordinates(i.h3)} (H3 ${i.h3})${i.critical ? " · critical region" : ""}`,
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
      label: "Unusual activity",
      from: run[0],
      to: run[run.length - 1],
      value: run.reduce((acc, d) => acc + (byDay.get(d) ?? 0), 0),
    });
    start = i;
  }
  return {
    criterion: `days with unusual daily counts (robust z-score above ${timeseries.threshold.toLocaleString("en-US")}, using the period’s median and MAD)`,
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
  const observed = rows.reduce((acc, row) => acc + (row.current.detectionsPerDay ?? 0), 0);
  const reference = rows.reduce((acc, r) => acc + (r.meanDetectionsPerDay ?? 0), 0);
  const years = Math.min(...rows.map((r) => r.yearsWithData));
  const round = (n: number) => Number(n.toFixed(1));
  return {
    metric: "Detections per day in the period",
    unit: "detections/day",
    observed: round(observed),
    reference: round(reference),
    referencePeriod: `Same dates in ${years} previous years with records`,
    method: "Mean daily detections on the same dates in previous years",
    anomaly: round(observed - reference),
    anomalyDefinition:
      "Anomaly = observed − reference mean. A positive value indicates more detections per day than usual.",
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

export const ACTIVITY_SOURCE: DataOrigin = {
  name: "NASA FIRMS · harmonized activity (MODIS Aqua scale)",
  simulated: false,
};

const BASES: readonly TemperatureBasis[] = ["viirs", "aqua", "terra"];

function toTemperature(day: ApiActivityDay): TemperatureBin[] | null {
  if (!day.hasData || !day.temperature?.length) return null;
  return day.temperature.map((b) => ({
    key: b.key,
    fromK: b.fromK ?? null,
    toK: b.toK ?? null,
    value: b.harmonized,
  }));
}

export function toActivityDay(day: ApiActivityDay): ActivityDay {
  const value = day.hasData ? (day.harmonized ?? 0) : null;
  const status: DayStatus =
    value === null ? "unavailable" : value > 0 ? "activity" : "none";
  return {
    date: day.date,
    status,
    value,
    contributing: day.contributing,
    basis: day.hasData ? (BASES.find((b) => b === day.basis) ?? null) : null,
    temperature: toTemperature(day),
  };
}

export function toMonthAnomaly(raw: ApiActivityAnomalyResponse): MonthAnomaly {
  return {
    sufficient: raw.sufficient,
    current: raw.current,
    baselineMedian: raw.baselineMedian,
    deviationPct: raw.deviationPct,
    yearsWithData: raw.yearsWithData,
    minYears: raw.minYears,
    note: raw.note ? englishApiMessage(raw.note) : raw.note,
  };
}

export function toDaySatellites(
  raw: ApiActivityAvailabilityResponse,
  date: string,
): DaySatellites {
  const rows = raw.days.filter((d) => d.date === date);
  return {
    date,
    contributing: rows.filter((d) => d.contributes).map((d) => d.platform),
    available: rows.filter((d) => d.available).map((d) => d.platform),
  };
}

export function toCellHistory(
  cell: string,
  sensors: SensorId[],
  historical: ApiHistoricalResponse,
): CellHistory | null {
  const rows = historical.sensors.filter((s) => sensors.includes(lower(s.sensor)));
  if (rows.length === 0) return null;
  const first = rows[0].current;
  const byYear = new Map<number, number>();
  for (const row of rows) {
    for (const year of row.baseline ?? []) {
      byYear.set(year.year, (byYear.get(year.year) ?? 0) + year.detections);
    }
  }
  const sufficient = rows.every((row) => row.sufficient && row.meanDetectionsPerDay != null);
  const currentPerDay = rows.reduce((sum, row) => sum + (row.current.detectionsPerDay ?? 0), 0);
  const meanPerDay = sufficient
    ? rows.reduce((sum, row) => sum + (row.meanDetectionsPerDay ?? 0), 0)
    : null;
  return {
    cell,
    start: first.start,
    end: first.end,
    days: first.days,
    current: {
      year: Number(first.start.slice(0, 4)),
      detections: rows.reduce((sum, row) => sum + row.current.detections, 0),
    },
    years: [...byYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, detections]) => ({ year, detections })),
    currentPerDay,
    meanPerDay,
    changePct: meanPerDay !== null && meanPerDay > 0
      ? ((currentPerDay - meanPerDay) / meanPerDay) * 100
      : null,
    anomalousSensors: sufficient ? rows.filter((row) => row.anomalous).map((row) => row.sensor) : [],
    sufficient,
    yearsWithData: Math.min(...rows.map((row) => row.yearsWithData)),
    minYears: historical.minYears,
    yearsRequested: historical.yearsRequested,
    notes: [...new Set(rows.flatMap((row) => row.note ? [`${row.sensor}: ${englishApiMessage(row.note)}`] : []))],
  };
}
