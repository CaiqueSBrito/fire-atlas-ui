"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchActivityMonth, fetchDaySatellites, fetchMonthAnomaly } from "@/lib/api/activity";

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
