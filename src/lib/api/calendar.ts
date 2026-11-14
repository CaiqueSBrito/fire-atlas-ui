import { getRegion } from "@/config/regions";
import { monthOf } from "@/lib/utils/dates";
import { cellsForBbox } from "@/lib/utils/h3-region";
import type { ApiCalendarResponse, ApiDetectionsResponse } from "@/types/api";
import type { DayResponse, MonthResponse, PassTime } from "@/types/calendar";
import {
  API_SOURCE,
  dayCounts,
  dayStatus,
  toDetectionGrid,
  toMonthDays,
} from "./adapters";
import { apiFetch, hasApi } from "./client";
import { fetchCoverage, isCovered } from "./coverage";
import { finestResolution, zoomFor } from "./detections";
import { mockDay, mockMonth } from "./mock-calendar";

export const PASS_TIME_UNSUPPORTED =
  "A fonte de dados (camada agregada por célula H3) não separa passagem diurna e noturna.";

async function regionOf(region: string) {
  const coverage = await fetchCoverage();
  const cells = cellsForBbox(getRegion(region).bbox, coverage.resolutions).cells;
  return { coverage, cells: cells.join(",") };
}

export async function fetchMonth(
  month: string,
  region: string,
  signal?: AbortSignal,
): Promise<MonthResponse> {
  if (!hasApi) return mockMonth(month, region, signal);
  const { coverage, cells } = await regionOf(region);
  const calendar = await apiFetch<ApiCalendarResponse>(
    "/calendar",
    { cells, month, sensor: "BOTH" },
    signal,
  );
  return {
    month,
    region,
    days: toMonthDays(calendar, (date) => isCovered(coverage, date)),
    source: API_SOURCE,
  };
}

export async function fetchDay(
  date: string,
  region: string,
  passTime: PassTime,
  signal?: AbortSignal,
): Promise<DayResponse> {
  if (!hasApi) return mockDay(date, region, passTime, signal);
  if (passTime !== "all") {
    return {
      date,
      region,
      passTime,
      status: "unavailable",
      detections: [],
      note: PASS_TIME_UNSUPPORTED,
      imagery: [],
      source: API_SOURCE,
    };
  }
  const { coverage, cells } = await regionOf(region);
  const [grid, calendar] = await Promise.all([
    apiFetch<ApiDetectionsResponse>(
      "/detections",
      { cells, start: date, end: date, sensor: "BOTH", zoom: zoomFor(coverage) },
      signal,
    ),
    apiFetch<ApiCalendarResponse>(
      "/calendar",
      { cells, month: monthOf(date), sensor: "BOTH" },
      signal,
    ),
  ]);

  const counts = dayCounts(calendar, date) ?? { MODIS: 0, VIIRS: 0 };
  const total = (counts.MODIS ?? 0) + (counts.VIIRS ?? 0);
  const status = dayStatus(total, isCovered(coverage, date));

  return {
    date,
    region,
    passTime,
    status,
    counts: status === "unavailable" ? undefined : counts,
    detections: [],
    grid: toDetectionGrid(grid, finestResolution(coverage)),
    imagery: [],
    source: API_SOURCE,
  };
}
