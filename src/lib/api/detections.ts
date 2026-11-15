import { cellsForBbox } from "@/lib/utils/h3-region";
import { splitBbox } from "@/lib/utils/tiles";
import type {
  ApiActivityCellsResponse,
  ApiCompareResponse,
  ApiHistoricalResponse,
  ApiRankingResponse,
  ApiTimeseriesResponse,
} from "@/types/api";
import type { DetectionQuery, DetectionsResponse } from "@/types/detections";
import type { StatsResponse } from "@/types/stats";
import { sensorParam, toActivityGrid, toStatsResponse } from "./adapters";
import { apiFetch, hasApi } from "./client";
import { isCovered, requireCoverage, type Coverage, type CoverageTable } from "./coverage";
import { mockDetections, type MockMode } from "./mock-detections";
import { mockStats } from "./mock-stats";

export const RANKING_LIMIT = 10;
export const HISTORY_YEARS = 5;
const MIN_ZOOM = 3;
const MAX_ZOOM = 6;

export function finestResolution(coverage: Coverage): number {
  return Math.max(...coverage.resolutions);
}

export function zoomFor(coverage: Coverage): string {
  return String(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, finestResolution(coverage))));
}

export async function regionParams(q: DetectionQuery, table: CoverageTable) {
  const coverage = await requireCoverage(table);
  const region = cellsForBbox(q.bbox, coverage.resolutions);
  return {
    coverage,
    resolution: region.resolution,
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
      const { coverage, params } = await regionParams({ ...q, bbox: tile }, "cells");
      const raw = await apiFetch<ApiActivityCellsResponse>(
        "/activity/cells",
        { cells: params.cells, start: params.start, end: params.end, zoom: zoomFor(coverage) },
        signal,
      );
      return { raw, coverage };
    }),
  );
  return toActivityGrid(
    tiles.map((t) => t.raw),
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
  const { coverage, resolution, params } = await regionParams(q, "grid");
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
    isCovered: (date) => isCovered(coverage, date, resolution),
    ranking,
    historical,
  });
}
