import { formatBboxParam } from "@/lib/utils/bbox";
import type { DetectionQuery, DetectionsResponse } from "@/types/detections";
import type { StatsResponse } from "@/types/stats";
import { apiFetch, hasApi } from "./client";
import { mockDetections, type MockMode } from "./mock-detections";
import { mockStats } from "./mock-stats";

function params(q: DetectionQuery) {
  return {
    sensors: q.sensors.join(","),
    from: q.from,
    to: q.to,
    bbox: formatBboxParam(q.bbox),
  };
}

export function fetchDetections(
  q: DetectionQuery,
  mock: MockMode,
  signal?: AbortSignal,
): Promise<DetectionsResponse> {
  if (!hasApi) return mockDetections(q, mock, signal);
  return apiFetch<DetectionsResponse>("/detections", params(q), signal);
}

export function fetchStats(
  q: DetectionQuery,
  mock: MockMode,
  signal?: AbortSignal,
): Promise<StatsResponse> {
  if (!hasApi) return mockStats(q, mock, signal);
  return apiFetch<StatsResponse>("/stats", params(q), signal);
}
