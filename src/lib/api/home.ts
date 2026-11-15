import { cellToLatLng, getRes0Cells } from "h3-js";
import { shiftDate } from "@/lib/utils/dates";
import type { ApiCountResponse, ApiDetectionsResponse } from "@/types/api";
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

const WORLD_RESOLUTION = 0;
const worldCells = () => getRes0Cells().join(",");

async function latestWindow(days: number): Promise<{ from: string; to: string } | null> {
  const coverage = await fetchCoverage("grid");
  const periods = coverage.periods[WORLD_RESOLUTION] ?? [];
  const last = periods[periods.length - 1];
  if (!last) return null;
  const from = shiftDate(last.to, -(days - 1));
  return { from: from > last.from ? from : last.from, to: last.to };
}

export async function fetchHomeSummary(signal?: AbortSignal): Promise<HomeSummary | null> {
  if (!hasApi) return null;
  const period = await latestWindow(SUMMARY_DAYS);
  if (!period) return null;
  const { from, to } = period;
  const raw = await apiFetch<ApiCountResponse>(
    "/detections/count",
    { cells: worldCells(), start: from, end: to, sensor: "BOTH" },
    signal,
  );
  const of = (sensor: "MODIS" | "VIIRS") =>
    raw.sensors.find((s) => s.sensor === sensor)?.detections ?? 0;
  return { from, to, total: raw.total, modis: of("MODIS"), viirs: of("VIIRS") };
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
    { cells: worldCells(), start: period.from, end: period.to, sensor: "BOTH", zoom: "3" },
    signal,
  );
  const totals = new Map<string, number>();
  for (const c of raw.cells ?? []) totals.set(c.h3, (totals.get(c.h3) ?? 0) + c.count);
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (!top.length) return null;
  return top.map(([id]) => {
    const [lat, lon] = cellToLatLng(id);
    return [lat, lon];
  });
}
