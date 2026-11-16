"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchCellHistory, fetchDetections, fetchStats } from "@/lib/api/detections";
import { hasApi } from "@/lib/api/client";
import { fetchHarmonizedMonthly } from "@/lib/api/activity";
import { fetchForecast } from "@/lib/api/forecast";
import { getForecastBootstrap, startForecastBootstrap } from "@/lib/api/bootstrap";
import { regionQueryKey } from "@/lib/api/query-region";
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
  const region = useMemo(() => regionQueryKey(query.bbox, true), [query.bbox]);
  const result = useQuery({
    queryKey: ["detections", query.from, query.to, [...query.sensors].sort(), region, mock],
    queryFn: ({ signal }) => fetchDetections(query, mock, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
  return { ...result, filters, enabled };
}

export function useStats() {
  const { query, mock, enabled, filters } = useQueryParams();
  const region = useMemo(() => regionQueryKey(query.bbox), [query.bbox]);
  const result = useQuery({
    queryKey: ["stats", query.from, query.to, [...query.sensors].sort(), region, mock],
    queryFn: ({ signal }) => fetchStats(query, mock, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
  return { ...result, filters, enabled };
}

function useForecastBootstrap(enabled: boolean) {
  const client = useQueryClient();
  const restart = useMutation({
    mutationFn: () => startForecastBootstrap(),
    onSuccess: (status) => client.setQueryData(["forecast-bootstrap"], status),
  });
  const query = useQuery({
    queryKey: ["forecast-bootstrap"],
    queryFn: ({ signal }) => getForecastBootstrap(signal),
    enabled: hasApi && enabled,
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data?.state === "loading" || query.state.data?.state === "idle" ? 1_500 : false,
  });
  return { ...query, error: restart.error ?? query.error, restart: restart.mutate };
}

export function useForecast() {
  const { filters } = useResolvedFilters();
  const enabled = filters.problem === null;
  const bootstrap = useForecastBootstrap(enabled);
  const ready = !hasApi || bootstrap.data?.state === "ready";
  const region = useMemo(() => regionQueryKey(filters.bbox), [filters.bbox]);
  const result = useQuery({
    queryKey: ["forecast", region],
    queryFn: ({ signal }) => fetchForecast(filters.bbox, signal),
    enabled: enabled && ready,
    placeholderData: keepPreviousData,
  });
  return { ...result, filters, enabled, bootstrap };
}

export function useMapForecast(area: Bbox, enabled: boolean) {
  const bootstrap = useForecastBootstrap(enabled);
  return useQuery({
    queryKey: ["map-forecast", area],
    queryFn: ({ signal }) => fetchForecast(area, signal),
    enabled: hasApi && enabled && bootstrap.data?.state === "ready",
    placeholderData: keepPreviousData,
  });
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

export function useCellHistory(cell: string | null) {
  const { filters } = useResolvedFilters();
  const sensors = [...filters.sensors].sort();
  return useQuery({
    queryKey: ["cell-history", cell, filters.to, sensors],
    queryFn: ({ signal }) => fetchCellHistory(cell!, filters.to, sensors, signal),
    enabled: hasApi && cell !== null && filters.problem === null && sensors.length > 0,
  });
}
