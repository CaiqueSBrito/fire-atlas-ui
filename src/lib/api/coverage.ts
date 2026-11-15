import { shiftDate } from "@/lib/utils/dates";
import type { ApiSource } from "@/types/api";
import { ApiError, apiFetch } from "./client";

export type CoverageTable = "cells" | "grid" | "forecast";

export type DatePeriod = { from: string; to: string };

export type Coverage = {
  resolutions: number[];
  periods: Record<number, DatePeriod[]>;
  minDate: string | null;
  maxDate: string | null;
};

const TABLES: Record<CoverageTable, { prefix: string; label: string }> = {
  cells: { prefix: "gold/harmonized/cells/", label: "atividade harmonizada (gold/harmonized/cells)" },
  grid: { prefix: "gold/map_grid/", label: "grade de detecções (gold/map_grid)" },
  forecast: { prefix: "gold/forecast/", label: "previsão (gold/forecast)" },
};

export const FORECAST_RESOLUTION = 6;
export const COVERAGE_TTL_MS = 60_000;

const RESOLUTION = /\/resolution=(\d+)\//;

const EMPTY: Coverage = { resolutions: [], periods: {}, minDate: null, maxDate: null };

export function notImportedMessage(table: CoverageTable): string {
  return `O backend ainda não tem nenhuma importação concluída de ${TABLES[table].label}. Rode scripts/atualizar.sh no fire-atlas-api para baixar a camada gold para o PostgreSQL e recarregue a página.`;
}

export class NotImportedError extends ApiError {
  constructor(public readonly table: CoverageTable) {
    super(notImportedMessage(table), undefined, false);
    this.name = "NotImportedError";
  }
}

function without(periods: DatePeriod[], cut: DatePeriod): DatePeriod[] {
  const out: DatePeriod[] = [];
  for (const p of periods) {
    if (p.to < cut.from || p.from > cut.to) {
      out.push(p);
      continue;
    }
    if (p.from < cut.from) out.push({ from: p.from, to: shiftDate(cut.from, -1) });
    if (p.to > cut.to) out.push({ from: shiftDate(cut.to, 1), to: p.to });
  }
  return out;
}

function merged(periods: DatePeriod[]): DatePeriod[] {
  const out: DatePeriod[] = [];
  for (const p of [...periods].sort((a, b) => a.from.localeCompare(b.from))) {
    const last = out[out.length - 1];
    if (last && p.from <= shiftDate(last.to, 1)) {
      if (p.to > last.to) last.to = p.to;
    } else {
      out.push({ ...p });
    }
  }
  return out;
}

function loadedPeriod(source: ApiSource): DatePeriod | null {
  if (source.rowsLoaded <= 0) return null;
  return { from: source.minDate ?? source.periodStart, to: source.maxDate ?? source.periodEnd };
}

function bounds(periods: DatePeriod[]): Pick<Coverage, "minDate" | "maxDate"> {
  let minDate: string | null = null;
  let maxDate: string | null = null;
  for (const p of periods) {
    if (!minDate || p.from < minDate) minDate = p.from;
    if (!maxDate || p.to > maxDate) maxDate = p.to;
  }
  return { minDate, maxDate };
}

export function coverageFromSources(sources: ApiSource[], table: CoverageTable): Coverage {
  const { prefix } = TABLES[table];
  const chronological = sources
    .filter((s) => s.status === "COMPLETED" && s.sourceKey.startsWith(prefix))
    .reverse();

  if (table === "forecast") {
    const loaded = chronological.map(loadedPeriod).filter((p): p is DatePeriod => p !== null);
    if (!loaded.length) return EMPTY;
    return {
      resolutions: Array.from({ length: FORECAST_RESOLUTION + 1 }, (_, r) => r),
      periods: {},
      ...bounds(loaded),
    };
  }

  const byResolution = new Map<number, DatePeriod[]>();
  for (const source of chronological) {
    const match = RESOLUTION.exec(source.sourceKey);
    if (!match) continue;
    const resolution = Number(match[1]);
    const kept = without(byResolution.get(resolution) ?? [], {
      from: source.periodStart,
      to: source.periodEnd,
    });
    const loaded = loadedPeriod(source);
    byResolution.set(resolution, merged(loaded ? [...kept, loaded] : kept));
  }

  const periods: Record<number, DatePeriod[]> = {};
  for (const [resolution, list] of byResolution) {
    if (list.length) periods[resolution] = list;
  }
  const resolutions = Object.keys(periods).map(Number).sort((a, b) => a - b);
  return { resolutions, periods, ...bounds(Object.values(periods).flat()) };
}

export function isCovered(coverage: Coverage, date: string, resolution?: number): boolean {
  const periods =
    resolution === undefined ? Object.values(coverage.periods).flat() : coverage.periods[resolution] ?? [];
  return periods.some((p) => date >= p.from && date <= p.to);
}

let cached: { at: number; value: Promise<Record<CoverageTable, Coverage>> } | null = null;

export function fetchCoverage(table: CoverageTable): Promise<Coverage> {
  const now = Date.now();
  if (!cached || now - cached.at >= COVERAGE_TTL_MS) {
    const value = apiFetch<ApiSource[]>("/meta/sources").then((sources) => ({
      cells: coverageFromSources(sources, "cells"),
      grid: coverageFromSources(sources, "grid"),
      forecast: coverageFromSources(sources, "forecast"),
    }));
    cached = { at: now, value };
    value.catch(() => {
      if (cached?.value === value) cached = null;
    });
  }
  return cached.value.then((all) => all[table]);
}

export async function requireCoverage(table: CoverageTable): Promise<Coverage> {
  const coverage = await fetchCoverage(table);
  if (!coverage.resolutions.length) throw new NotImportedError(table);
  return coverage;
}
