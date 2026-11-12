"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { fetchTemperatureGrid } from "@/lib/api/temperature";
import { temperatureDateFor } from "@/lib/map-layers";
import { padBbox } from "@/lib/utils/bbox";
import { gridAxes } from "@/lib/utils/temperature-field";
import { useResolvedFilters } from "./use-filters";

export function useTemperature(enabled: boolean) {
  const { filters } = useResolvedFilters();
  const date = temperatureDateFor(filters.to);
  const axes = useMemo(() => gridAxes(padBbox(filters.bbox, 0.3)), [filters.bbox]);
  const query = useQuery({
    queryKey: [
      "temperature",
      axes.step,
      axes.lons[0],
      axes.lons[axes.lons.length - 1],
      axes.lats[0],
      axes.lats[axes.lats.length - 1],
      date,
    ],
    queryFn: ({ signal }) => fetchTemperatureGrid(axes, date, signal),
    enabled: enabled && filters.problem === null,
    staleTime: 30 * 60_000,
    retry: (count, error) =>
      count < 1 && !(error instanceof ApiError && (error.status === 429 || !error.recoverable)),
  });
  return { ...query, date };
}
