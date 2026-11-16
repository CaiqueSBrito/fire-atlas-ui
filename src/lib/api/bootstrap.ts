import { apiFetch } from "@/lib/api/client";
import { englishApiMessage } from "./english-message";

export type AnnualLoadingState = {
  state: "idle" | "loading" | "ready" | "failed";
  completedUnits: number;
  totalUnits: number;
  rowsLoaded: number;
  message: string;
  error: string | null;
  phase: "preparing" | "importing" | "indexes" | "validating" | "analyzing" | "ready";
  finalizationCompleted: number;
  finalizationTotal: number;
};

/** Arquivos confirmados + finalizacao + commit de publicacao; nunca antecipa 100%. */
export function bootstrapProgress(status: AnnualLoadingState): number {
  if (status.state === "ready") return 100;
  const completed = status.completedUnits + status.finalizationCompleted;
  const total = status.totalUnits + status.finalizationTotal + 1;
  return Math.min(99, Math.floor((completed / total) * 100));
}

function englishStatus(status: AnnualLoadingState): AnnualLoadingState {
  return {
    ...status,
    message: englishApiMessage(status.message),
    error: status.error ? englishApiMessage(status.error) : null,
  };
}

export function startAnnualBootstrap(signal?: AbortSignal): Promise<AnnualLoadingState> {
  return apiFetch<AnnualLoadingState>("/bootstrap/2026", {}, signal, {
    method: "POST",
    cache: "no-store",
  }).then(englishStatus);
}

export function getAnnualBootstrap(signal?: AbortSignal): Promise<AnnualLoadingState> {
  return apiFetch<AnnualLoadingState>("/bootstrap/2026", {}, signal, {
    cache: "no-store",
  }).then(englishStatus);
}

export function startForecastBootstrap(signal?: AbortSignal): Promise<AnnualLoadingState> {
  return apiFetch<AnnualLoadingState>("/bootstrap/forecast", {}, signal, {
    method: "POST",
    cache: "no-store",
  }).then(englishStatus);
}

export function getForecastBootstrap(signal?: AbortSignal): Promise<AnnualLoadingState> {
  return apiFetch<AnnualLoadingState>("/bootstrap/forecast", {}, signal, {
    cache: "no-store",
  }).then(englishStatus);
}
