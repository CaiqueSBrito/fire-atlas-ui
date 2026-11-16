import { cellToLatLng, getRes0Cells } from "h3-js";
import { shiftDate } from "@/lib/utils/dates";
import type { ApiCompareResponse, ApiDetectionsResponse } from "@/types/api";
import { apiFetch, hasApi } from "./client";
import { fetchCoverage } from "./coverage";

export const SUMMARY_DAYS = 30;
export const HOTSPOT_DAYS = 7;
export const HOTSPOT_LIMIT = 12;

export type HomeSummary = {
  from: string;
  to: string;
  total: number;
  modis: number;
  viirs: number;
};

async function latestWindow(days: number): Promise<{ from: string; to: string } | null> {
  const { minDate, maxDate } = await fetchCoverage();
  if (!minDate || !maxDate) return null;
  const from = shiftDate(maxDate, -(days - 1));
  return { from: from > minDate ? from : minDate, to: maxDate };
}

export async function fetchHomeSummary(signal?: AbortSignal): Promise<HomeSummary | null> {
  if (!hasApi) return null;
  const period = await latestWindow(SUMMARY_DAYS);
  if (!period) return null;
  const { from, to } = period;
  const raw = await apiFetch<ApiCompareResponse>(
    "/compare",
    { cells: getRes0Cells().join(","), start: from, end: to, sensor: "BOTH" },
    signal,
  );
  const modis = raw.sensors.find((s) => s.sensor === "MODIS")?.detections ?? 0;
  const viirs = raw.sensors.find((s) => s.sensor === "VIIRS")?.detections ?? 0;
  return { from, to, total: modis + viirs, modis, viirs };
}

export async function fetchTopHotspots(
  signal?: AbortSignal,
  limit = HOTSPOT_LIMIT,
): Promise<Array<[number, number]> | null> {
  if (!hasApi) return null;
  const period = await latestWindow(HOTSPOT_DAYS);
  if (!period) return null;
  const raw = await apiFetch<ApiDetectionsResponse>(
    "/detections",
    { cells: getRes0Cells().join(","), start: period.from, end: period.to, sensor: "BOTH", zoom: "3" },
    signal,
  );
  // Uma resposta parcial não permite identificar as células mais ativas do planeta.
  if (raw.truncated) return null;
  const totals = new Map<string, number>();
  for (const c of raw.cells ?? []) totals.set(c.h3, (totals.get(c.h3) ?? 0) + c.count);
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (!top.length) return null;
  return top.map(([id]) => {
    const [lat, lon] = cellToLatLng(id);
    return [lat, lon];
  });
}
