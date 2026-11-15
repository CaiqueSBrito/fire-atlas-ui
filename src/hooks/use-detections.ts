"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchDetections, fetchStats } from "@/lib/api/detections";
import { fetchForecast } from "@/lib/api/forecast";
import type { Bbox, DetectionQuery } from "@/types/detections";
import { useResolvedFilters } from "./use-filters";

function useQueryParams(area?: Bbox | null) {
  const ctx = useResolvedFilters();
  const { filters } = ctx;
  const query: DetectionQuery = {
    sensors: filters.sensors,
    from: filters.from,
    to: filters.to,
    bbox: area ?? filters.bbox,
  };
  const enabled = filters.problem === null && filters.sensors.length > 0;
  return { ...ctx, query, enabled };
}

export function useDetections(area?: Bbox | null) {
  const { query, mock, enabled, filters } = useQueryParams(area);
  const result = useQuery({
    queryKey: ["detections", query, mock],
    queryFn: ({ signal }) => fetchDetections(query, mock, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
  return { ...result, filters, enabled };
}

export function useStats() {
  const { query, mock, enabled, filters } = useQueryParams();
  const result = useQuery({
    queryKey: ["stats", query, mock],
    queryFn: ({ signal }) => fetchStats(query, mock, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
  return { ...result, filters, enabled };
}

export function useForecast() {
  const { filters } = useResolvedFilters();
  const enabled = filters.problem === null;
  const result = useQuery({
    queryKey: ["forecast", filters.bbox],
    queryFn: ({ signal }) => fetchForecast(filters.bbox, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
  return { ...result, filters, enabled };
}
