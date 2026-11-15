import { getRegion } from "@/config/regions";
import { cellsForBbox } from "@/lib/utils/h3-region";
import type {
  ApiActivityAnomalyResponse,
  ApiActivityAvailabilityResponse,
  ApiActivityCalendarResponse,
} from "@/types/api";
import type { ActivityMonth, DaySatellites, MonthAnomaly } from "@/types/calendar";
import {
  ACTIVITY_SOURCE,
  toActivityDay,
  toDaySatellites,
  toMonthAnomaly,
} from "./adapters";
import { apiFetch, hasApi } from "./client";
import { fetchCoverage } from "./coverage";
import { mockActivityMonth, mockDaySatellites, mockMonthAnomaly } from "./mock-activity";

export const UNIT_LABEL_FALLBACK =
  "Atividade de fogo harmonizada (células ativas equivalentes ao MODIS Aqua)";

const CONTINENTS: Record<string, string> = {
  "north-america": "North America",
  "south-america": "South America",
  europe: "Europe",
  africa: "Africa",
  asia: "Asia",
  oceania: "Oceania",
};

const COUNTRIES: Record<string, string> = { brasil: "BR" };

export async function activityRegionParams(region: string): Promise<Record<string, string>> {
  if (CONTINENTS[region]) return { continent: CONTINENTS[region] };
  if (COUNTRIES[region]) return { country: COUNTRIES[region] };
  const coverage = await fetchCoverage();
  return { cells: cellsForBbox(getRegion(region).bbox, coverage.resolutions).cells.join(",") };
}

export async function fetchActivityMonth(
  month: string,
  region: string,
  signal?: AbortSignal,
): Promise<ActivityMonth> {
  if (!hasApi) return mockActivityMonth(month, region, signal);
  const raw = await apiFetch<ApiActivityCalendarResponse>(
    "/activity/calendar",
    { ...(await activityRegionParams(region)), month },
    signal,
  );
  return {
    month,
    region,
    days: raw.days.map(toActivityDay),
    unitLabel: raw.meta?.unitLabelPt ?? UNIT_LABEL_FALLBACK,
    warnings: raw.meta?.warnings ?? [],
    source: ACTIVITY_SOURCE,
  };
}

export async function fetchMonthAnomaly(
  month: string,
  region: string,
  signal?: AbortSignal,
): Promise<MonthAnomaly> {
  if (!hasApi) return mockMonthAnomaly(month, signal);
  const raw = await apiFetch<ApiActivityAnomalyResponse>(
    "/activity/anomaly",
    { ...(await activityRegionParams(region)), month, years: "5" },
    signal,
  );
  return toMonthAnomaly(raw);
}

export async function fetchDaySatellites(
  date: string,
  signal?: AbortSignal,
): Promise<DaySatellites> {
  if (!hasApi) return mockDaySatellites(date, signal);
  const raw = await apiFetch<ApiActivityAvailabilityResponse>(
    "/activity/availability",
    { start: date, end: date },
    signal,
  );
  return toDaySatellites(raw, date);
}
