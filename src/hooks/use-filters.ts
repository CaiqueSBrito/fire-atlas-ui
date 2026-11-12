"use client";

import { useMemo } from "react";
import { parseAsStringLiteral, useQueryState, useQueryStates } from "nuqs";
import { filterParsers, resolveFilters, type RawFilters } from "@/lib/filters";
import type { MockMode } from "@/lib/api/mock-detections";
import type { SensorId } from "@/types/detections";

const MOCK_MODES = ["error", "empty"] as const;

export function useFilters() {
  return useQueryStates(filterParsers, { history: "replace" });
}

export function useResolvedFilters() {
  const [raw, setRaw] = useFilters();
  const [mockParam] = useQueryState("mock", parseAsStringLiteral(MOCK_MODES));
  const mock: MockMode =
    process.env.NODE_ENV === "production" ? null : mockParam;

  const sensorsKey = raw.sensors.join(",");
  const { from, to, region, bbox, date } = raw;
  const filters = useMemo(
    () =>
      resolveFilters({
        sensors: (sensorsKey ? sensorsKey.split(",") : []) as SensorId[],
        from,
        to,
        region,
        bbox,
        date,
      }),
    [sensorsKey, from, to, region, bbox, date],
  );
  return { raw: raw as RawFilters, setRaw, filters, mock };
}
