import { cellsForBbox } from "@/lib/utils/h3-region";
import type { ApiForecastResponse } from "@/types/api";
import type { Bbox } from "@/types/detections";
import type { ForecastResponse } from "@/types/forecast";
import { toForecastResponse } from "./adapters";
import { apiFetch, hasApi } from "./client";
import { fetchCoverage } from "./coverage";

export const FORECAST_LIMIT = 100;

export const MAP_FORECAST_LIMIT = 2000;

export async function fetchForecast(
  bbox: Bbox,
  signal?: AbortSignal,
  limit: number = FORECAST_LIMIT,
): Promise<ForecastResponse> {
  if (!hasApi) {
    return {
      status: "unavailable",
      reason: "The forecast service is not configured in this environment.",
    };
  }
  const coverage = await fetchCoverage();
  const { cells } = cellsForBbox(bbox, coverage.resolutions);
  const raw = await apiFetch<ApiForecastResponse>(
    "/forecast",
    { cells: cells.join(","), limit: String(limit) },
    signal,
  );
  return toForecastResponse(raw);
}
