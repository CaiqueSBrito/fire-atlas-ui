import { formatBboxParam } from "@/lib/utils/bbox";
import { shiftDate, todayUtc } from "@/lib/utils/dates";
import type { ApiPredictionResponse } from "@/types/api";
import type { Bbox } from "@/types/detections";
import type { ForecastResponse } from "@/types/forecast";
import { ApiError, apiFetch, hasApi } from "./client";

const UNAVAILABLE = (reason: string): ForecastResponse => ({
  status: "unavailable",
  reason,
});

export async function fetchForecast(
  _regionId: string,
  bbox: Bbox,
  signal?: AbortSignal,
  period?: { from: string; to: string },
): Promise<ForecastResponse> {
  if (!hasApi) {
    return UNAVAILABLE("O serviço de previsões não está configurado neste ambiente.");
  }
  const to = period?.to ?? todayUtc();
  const from = period?.from ?? shiftDate(to, -6);
  try {
    const raw = await apiFetch<ApiPredictionResponse>(
      "/predictions",
      { bbox: formatBboxParam(bbox), start: from, end: to },
      signal,
    );
    if (raw.available) {
      return UNAVAILABLE(
        "O serviço devolveu uma previsão, mas a interface ainda não exibe esse formato.",
      );
    }
    return UNAVAILABLE(
      raw.reason ??
        "O serviço de previsões não devolveu uma previsão válida para este recorte.",
    );
  } catch (error) {
    if (error instanceof ApiError && [404, 501, 503].includes(error.status ?? 0)) {
      return UNAVAILABLE("O serviço de previsões está indisponível no momento.");
    }
    throw error;
  }
}
