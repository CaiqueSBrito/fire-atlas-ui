import { cellsForBbox, MAX_H3_RESOLUTION } from "@/lib/utils/h3-region";
import { splitBbox } from "@/lib/utils/tiles";
import type {
  ApiCompareResponse,
  ApiDetectionsResponse,
  ApiHistoricalResponse,
  ApiRankingResponse,
  ApiTimeseriesResponse,
} from "@/types/api";
import type { DetectionQuery, DetectionsResponse, SensorId } from "@/types/detections";
import type { CellHistory, StatsResponse } from "@/types/stats";
import {
  mergeDetections,
  sensorParam,
  toCellHistory,
  toDetectionsResponse,
  toStatsResponse,
} from "./adapters";
import { apiFetch, hasApi } from "./client";
import { fetchCoverage, isCovered, type Coverage } from "./coverage";
import { mockDetections, type MockMode } from "./mock-detections";
import { mockStats } from "./mock-stats";

export const RANKING_LIMIT = 10;
export const HISTORY_YEARS = 5;
const MIN_ZOOM = 3;
const MAX_ZOOM = MAX_H3_RESOLUTION;

export function finestResolution(coverage: Coverage): number {
  let finest: number | null = null;
  for (const res of coverage.resolutions) {
    if (res <= MAX_H3_RESOLUTION && (finest === null || res > finest)) finest = res;
  }
  return finest ?? MIN_ZOOM;
}

export function zoomFor(coverage: Coverage): string {
  return String(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, finestResolution(coverage))));
}


export async function regionParams(q: DetectionQuery) {
  const coverage = await fetchCoverage();
  const region = cellsForBbox(q.bbox, coverage.resolutions);
  return {
    coverage,
    params: {
      cells: region.cells.join(","),
      start: q.from,
      end: q.to,
      sensor: sensorParam(q.sensors),
    },
  };
}

export async function fetchDetections(
  q: DetectionQuery,
  mock: MockMode,
  signal?: AbortSignal,
): Promise<DetectionsResponse> {
  if (!hasApi) return mockDetections(q, mock, signal);
  const tiles = await Promise.all(
    splitBbox(q.bbox).map(async (tile) => {
      const { coverage, params } = await regionParams({ ...q, bbox: tile });
      const raw = await apiFetch<ApiDetectionsResponse>(
        "/detections",
        { ...params, zoom: zoomFor(coverage) },
        signal,
      );
      return { raw, coverage };
    }),
  );
  return toDetectionsResponse(
    mergeDetections(tiles.map((t) => t.raw)),
    finestResolution(tiles[0].coverage),
  );
}

async function optional<T>(request: Promise<T>, signal?: AbortSignal): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}

export async function fetchStats(
  q: DetectionQuery,
  mock: MockMode,
  signal?: AbortSignal,
): Promise<StatsResponse> {
  if (!hasApi) return mockStats(q, mock, signal);
  const { coverage, params } = await regionParams(q);
  const [compare, timeseries, ranking, historical] = await Promise.all([
    apiFetch<ApiCompareResponse>("/compare", params, signal),
    apiFetch<ApiTimeseriesResponse>("/timeseries", params, signal),
    optional(
      apiFetch<ApiRankingResponse>(
        "/rankings/cells",
        {
          ...params,
          resolution: String(finestResolution(coverage)),
          limit: String(RANKING_LIMIT),
        },
        signal,
      ),
      signal,
    ),
    optional(
      apiFetch<ApiHistoricalResponse>(
        "/compare/historical",
        { ...params, years: String(HISTORY_YEARS) },
        signal,
      ),
      signal,
    ),
  ]);
  return toStatsResponse(q.sensors, compare, timeseries, {
    isCovered: (date) => isCovered(coverage, date),
    ranking,
    historical,
  });
}

export function monthWindow(to: string): { start: string; end: string } {
  return { start: `${to.slice(0, 8)}01`, end: to };
}

export async function fetchCellHistory(
  cell: string,
  to: string,
  sensors: SensorId[],
  signal?: AbortSignal,
): Promise<CellHistory | null> {
  if (!hasApi) return null;
  const { start, end } = monthWindow(to);
  const raw = await apiFetch<ApiHistoricalResponse>(
    "/compare/historical",
    { cells: cell, start, end, sensor: sensorParam(sensors), years: String(HISTORY_YEARS) },
    signal,
  );
  return toCellHistory(cell, sensors, raw);
}
