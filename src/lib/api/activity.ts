import { getRegion } from "@/config/regions";
import { cellsForBbox } from "@/lib/utils/h3-region";
import type {
  ApiActivityAnomalyResponse,
  ApiActivityAvailabilityResponse,
  ApiActivityCalendarResponse,
  ApiActivityMonthlyResponse,
} from "@/types/api";
import type { Bbox } from "@/types/detections";
import type { HarmonizedMonthly } from "@/types/stats";
import { monthOf, shiftMonth } from "@/lib/utils/dates";
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
import { englishApiMessage } from "./english-message";

export const UNIT_LABEL_FALLBACK =
  "Harmonized fire activity (MODIS Aqua-equivalent active cells)";

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
    unitLabel: UNIT_LABEL_FALLBACK,
    warnings: raw.meta?.warnings?.map(englishApiMessage) ?? [],
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

export const MONTHLY_SPAN = 12;

export function toHarmonizedMonthly(raw: ApiActivityMonthlyResponse): HarmonizedMonthly {
  return {
    months: raw.months.map((m) => ({
      month: m.month,
      value: m.daysWithData > 0 && typeof m.harmonized === "number" ? m.harmonized : null,
      daysWithData: m.daysWithData,
      daysInMonth: m.daysInMonth,
      complete: m.complete,
    })),
    unitLabel: UNIT_LABEL_FALLBACK,
    warnings: raw.meta?.warnings?.map(englishApiMessage) ?? [],
  };
}

export async function fetchHarmonizedMonthly(
  area: { regionId: string; bbox: Bbox; customArea: boolean; to: string },
  signal?: AbortSignal,
): Promise<HarmonizedMonthly | null> {
  if (!hasApi) return null;
  const end = monthOf(area.to);
  let region: Record<string, string>;
  if (area.customArea) {
    const coverage = await fetchCoverage();
    region = { cells: cellsForBbox(area.bbox, coverage.resolutions).cells.join(",") };
  } else {
    region = await activityRegionParams(area.regionId);
  }
  const raw = await apiFetch<ApiActivityMonthlyResponse>(
    "/activity/monthly",
    { ...region, start: shiftMonth(end, -(MONTHLY_SPAN - 1)), end },
    signal,
  );
  return toHarmonizedMonthly(raw);
}
