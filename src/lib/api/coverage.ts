import type { ApiCoverage } from "@/types/api";
import { apiFetch } from "./client";

export type Coverage = {
  resolutions: number[];
  minDate: string | null;
  maxDate: string | null;
};

/**
 * A gold publica H3 de 0 a 6 em todas as tabelas e a API consulta o data lake direto (Athena): não há mais
 * importação parcial, então toda resolução está sempre disponível. Antes isso era deduzido das importações
 * concluídas em /meta/sources, rota que deixou de existir.
 */
export const GOLD_RESOLUTIONS = [0, 1, 2, 3, 4, 5, 6];

/** O período coberto muda uma vez por dia; cada consulta ao lake custa segundos, então o cache vale mais. */
const TTL_MS = 10 * 60_000;

let cached: { at: number; value: Promise<Coverage> } | null = null;

export function coverageFromApi(entries: ApiCoverage[]): Coverage {
  let minDate: string | null = null;
  let maxDate: string | null = null;
  for (const entry of entries) {
    if (entry.minDate && (!minDate || entry.minDate < minDate)) minDate = entry.minDate;
    if (entry.maxDate && (!maxDate || entry.maxDate > maxDate)) maxDate = entry.maxDate;
  }
  return { resolutions: minDate ? [...GOLD_RESOLUTIONS] : [], minDate, maxDate };
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
  const value = apiFetch<ApiCoverage[]>("/meta/coverage").then(coverageFromApi);
  cached = { at: now, value };
  value.catch(() => {
    if (cached?.value === value) cached = null;
  });
  return value;
}

export function resetCoverageCache() {
  cached = null;
}
