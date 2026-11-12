import type { Filters } from "@/lib/filters";
import type { FireSummary } from "@/types/fires";
import { ApiError, apiFetch, hasApi } from "./client";

export type MockMode = "error" | "empty" | null;

/**
 * Resumo de detecções para os filtros atuais.
 * Com NEXT_PUBLIC_API_URL usa a API Spring Boot; sem ela, gera dados mock
 * determinísticos. Em dev, `?mock=error` e `?mock=empty` simulam os estados.
 */
export async function fetchFireSummary(
  filters: Filters,
  mock: MockMode,
  signal?: AbortSignal,
): Promise<FireSummary> {
  if (hasApi) {
    return apiFetch<FireSummary>(
      "/fires/summary",
      { satellite: filters.satellite, from: filters.from, to: filters.to },
      signal,
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 700));
  if (mock === "error") {
    throw new ApiError("Simulação: o servidor está indisponível.");
  }
  if (mock === "empty") return { total: 0, bySatellite: {} };

  const seed = hash(`${filters.from}|${filters.to}`);
  const base = 8000 + (seed % 40000);
  const modis = Math.round(base * 0.45);
  const viirs = base - modis;
  const harmonized = Math.round(base * 0.9);

  switch (filters.satellite) {
    case "modis":
      return { total: modis, bySatellite: { modis } };
    case "viirs":
      return { total: viirs, bySatellite: { viirs } };
    case "harmonized":
      return { total: harmonized, bySatellite: { harmonized } };
    default:
      return { total: base, bySatellite: { modis, viirs } };
  }
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}
