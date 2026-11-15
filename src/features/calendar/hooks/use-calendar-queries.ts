"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchActivityMonth, fetchDaySatellites, fetchMonthAnomaly } from "@/lib/api/activity";
import { hasApi } from "@/lib/api/client";
import { fetchCoverage } from "@/lib/api/coverage";

export function useDetectionCoverage() {
  return useQuery({
    queryKey: ["detections", "coverage"],
    queryFn: fetchCoverage,
    enabled: hasApi,
    staleTime: 10 * 60_000,
  });
}

export function useActivityMonth(month: string, region: string) {
  return useQuery({
    queryKey: ["calendar", "activity", month, region],
    queryFn: ({ signal }) => fetchActivityMonth(month, region, signal),
    placeholderData: keepPreviousData,
  });
}

export function useMonthAnomaly(month: string, region: string) {
  return useQuery({
    queryKey: ["calendar", "anomaly", month, region],
    queryFn: ({ signal }) => fetchMonthAnomaly(month, region, signal),
  });
}

export function useDaySatellites(date: string | null) {
  return useQuery({
    queryKey: ["calendar", "satellites", date],
    queryFn: ({ signal }) => fetchDaySatellites(date!, signal),
    enabled: !!date,
  });
}
