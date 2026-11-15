"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchHarmonizedMonthly } from "@/lib/api/activity";
import { hasApi } from "@/lib/api/client";
import { fetchDetections, fetchStats } from "@/lib/api/detections";
import { fetchForecast, MAP_FORECAST_LIMIT } from "@/lib/api/forecast";
import type { Bbox, DetectionQuery } from "@/types/detections";
import { useResolvedFilters } from "./use-filters";
import { useRegionKey } from "./use-region-key";

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
  const region = useRegionKey(query.bbox, "cells", true);
  const result = useQuery({
    queryKey: ["detections", query.from, query.to, [...query.sensors].sort(), region.key, mock],
    queryFn: ({ signal }) => fetchDetections(query, mock, signal),
    enabled: enabled && region.ready,
    placeholderData: keepPreviousData,
  });
  return { ...result, filters, enabled };
}

export function useStats() {
  const { query, mock, enabled, filters } = useQueryParams();
  const region = useRegionKey(query.bbox, "grid");
  const result = useQuery({
    queryKey: ["stats", query.from, query.to, [...query.sensors].sort(), region.key, mock],
    queryFn: ({ signal }) => fetchStats(query, mock, signal),
    enabled: enabled && region.ready,
    placeholderData: keepPreviousData,
  });
  return { ...result, filters, enabled };
}

export function useHarmonizedMonthly() {
  const { filters } = useResolvedFilters();
  const area = {
    regionId: filters.regionId,
    bbox: filters.bbox,
    customArea: filters.customArea,
    to: filters.to,
  };
  return useQuery({
    queryKey: ["harmonized-monthly", area],
    queryFn: ({ signal }) => fetchHarmonizedMonthly(area, signal),
    enabled: hasApi && filters.problem === null,
    placeholderData: keepPreviousData,
  });
}

export function useMapForecast(area: Bbox, enabled: boolean) {
  return useQuery({
    queryKey: ["map-forecast", area],
    queryFn: ({ signal }) => fetchForecast(area, signal, MAP_FORECAST_LIMIT),
    enabled: hasApi && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useForecast() {
  const { filters } = useResolvedFilters();
  const enabled = filters.problem === null;
  const region = useRegionKey(filters.bbox, "forecast");
  const result = useQuery({
    queryKey: ["forecast", region.key],
    queryFn: ({ signal }) => fetchForecast(filters.bbox, signal, MAP_FORECAST_LIMIT),
    enabled: enabled && region.ready,
    placeholderData: keepPreviousData,
  });
  return { ...result, filters, enabled };
}
