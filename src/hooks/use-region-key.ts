"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { hasApi } from "@/lib/api/client";
import { COVERAGE_TTL_MS, fetchCoverage, type CoverageTable } from "@/lib/api/coverage";
import { regionQueryKey } from "@/lib/api/query-region";
import type { Bbox } from "@/types/detections";

export function useRegionKey(bbox: Bbox, table: CoverageTable, tiled = false) {
  const coverage = useQuery({
    queryKey: ["coverage", table],
    queryFn: () => fetchCoverage(table),
    enabled: hasApi,
    staleTime: COVERAGE_TTL_MS,
  });
  const resolutions = coverage.data?.resolutions;
  const key = useMemo(
    () => (resolutions ? regionQueryKey(bbox, resolutions, tiled) : bbox),
    [bbox, resolutions, tiled],
  );
  return { key, ready: !hasApi || !coverage.isPending };
}
