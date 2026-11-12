import { formatBboxParam } from "@/lib/utils/bbox";
import type { Bbox } from "@/types/detections";
import type { ForecastResponse } from "@/types/forecast";
import { ApiError, apiFetch, hasApi } from "./client";

const UNAVAILABLE = (reason: string): ForecastResponse => ({
  status: "unavailable",
  reason,
});

export async function fetchForecast(
  regionId: string,
  bbox: Bbox,
  signal?: AbortSignal,
): Promise<ForecastResponse> {
  if (!hasApi) {
    return UNAVAILABLE("O serviço de previsões não está configurado neste ambiente.");
  }
  try {
    return await apiFetch<ForecastResponse>(
      "/forecast",
      { region: regionId, bbox: formatBboxParam(bbox) },
      signal,
    );
  } catch (error) {
    if (error instanceof ApiError && [404, 501, 503].includes(error.status ?? 0)) {
      return UNAVAILABLE("O serviço de previsões está indisponível no momento.");
    }
    throw error;
  }
}
