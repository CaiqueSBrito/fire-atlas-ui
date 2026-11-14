import type { ApiSource } from "@/types/api";
import { apiFetch } from "./client";

export type Coverage = {
  resolutions: number[];
  minDate: string | null;
  maxDate: string | null;
};

const TTL_MS = 60_000;
const RESOLUTION = /resolution=(\d+)/;
const MAP_GRID = /^gold\/map_grid\//;

let cached: { at: number; value: Promise<Coverage> } | null = null;

export function coverageFromSources(sources: ApiSource[]): Coverage {
  const done = sources.filter((s) => s.status === "COMPLETED" && MAP_GRID.test(s.sourceKey));
  const resolutions = new Set<number>();
  let minDate: string | null = null;
  let maxDate: string | null = null;
  for (const s of done) {
    const match = RESOLUTION.exec(s.sourceKey);
    if (match) resolutions.add(Number(match[1]));
    const from = s.minDate ?? s.periodStart;
    const to = s.maxDate ?? s.periodEnd;
    if (!minDate || from < minDate) minDate = from;
    if (!maxDate || to > maxDate) maxDate = to;
  }
  return { resolutions: [...resolutions].sort((a, b) => a - b), minDate, maxDate };
}

export function isCovered(coverage: Coverage, date: string): boolean {
  return (
    coverage.minDate !== null &&
    coverage.maxDate !== null &&
    date >= coverage.minDate &&
    date <= coverage.maxDate
  );
}

export function fetchCoverage(): Promise<Coverage> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.value;
  const value = apiFetch<ApiSource[]>("/meta/sources").then(coverageFromSources);
  cached = { at: now, value };
  value.catch(() => {
    if (cached?.value === value) cached = null;
  });
  return value;
}

export function resetCoverageCache() {
  cached = null;
}
