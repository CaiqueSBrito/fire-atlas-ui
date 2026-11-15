import { apiFetch } from "@/lib/api/client";

export type AnnualLoadingState = {
  state: "idle" | "loading" | "ready" | "failed";
  completedUnits: number;
  totalUnits: number;
  rowsLoaded: number;
  message: string;
  error: string | null;
};

export function startAnnualBootstrap(signal?: AbortSignal): Promise<AnnualLoadingState> {
  return apiFetch<AnnualLoadingState>("/bootstrap/2026", {}, signal, {
    method: "POST",
    cache: "no-store",
  });
}

export function getAnnualBootstrap(signal?: AbortSignal): Promise<AnnualLoadingState> {
  return apiFetch<AnnualLoadingState>("/bootstrap/2026", {}, signal, {
    cache: "no-store",
  });
}
