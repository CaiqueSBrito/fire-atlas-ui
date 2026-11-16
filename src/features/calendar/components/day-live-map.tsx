"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ErrorState } from "@/components/feedback/error-state";
import type { Region } from "@/config/regions";
import { FireMap } from "@/features/map/components/fire-map-loader";
import { useQueryArea } from "@/hooks/use-query-area";
import { fetchDetections } from "@/lib/api/detections";
import { ApiError, hasApi } from "@/lib/api/client";
import { isCovered } from "@/lib/api/coverage";
import { regionQueryKey } from "@/lib/api/query-region";
import type { BasemapId, PlotId } from "@/lib/map-layers";
import { SENSORS } from "@/lib/sensors";
import { gridPlotPoints } from "@/lib/utils/hex";
import { computeHotAreas } from "@/lib/utils/hot-areas";
import type { Detection } from "@/types/calendar";
import type { Bbox } from "@/types/detections";
import { useDetectionCoverage } from "../hooks/use-calendar-queries";
import { RegionPlot } from "./region-plot";

const noop = () => {};
const NO_DETECTIONS: never[] = [];

export type DayMapLayers = {
  base: BasemapId;
  plot: PlotId;
  dots: boolean;
  heat: boolean;
  areas?: number;
};

export function DayLiveMap({
  region,
  date,
  viewBbox = null,
  layers,
  schematic = false,
}: {
  region: Region;
  date: string;
  viewBbox?: Bbox | null;
  layers?: DayMapLayers;
  schematic?: boolean;
}) {
  const base = viewBbox ?? region.bbox;
  const baseKey = base.join(",");
  const [viewportState, setViewportState] = useState<{ key: string; bbox: Bbox } | null>(null);
  const viewport = viewportState?.key === baseKey ? viewportState.bbox : null;
  const area = useQueryArea(viewport, base, true);
  const queryRegion = useMemo(() => regionQueryKey(area, true), [area]);
  const coverageQuery = useDetectionCoverage();
  const outsideCoverage = hasApi && !!coverageQuery.data && !isCovered(coverageQuery.data, date);

  const query = useQuery({
    queryKey: ["calendar", "day-grid", date, queryRegion],
    queryFn: ({ signal }) =>
      fetchDetections({ sensors: [...SENSORS], from: date, to: date, bbox: area }, null, signal),
    enabled: !hasApi || (!coverageQuery.isPending && !outsideCoverage),
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === date ? keepPreviousData(previous) : undefined,
  });

  const grid = outsideCoverage ? null : (query.data?.grid ?? null);
  const detections = outsideCoverage ? NO_DETECTIONS : (query.data?.items ?? NO_DETECTIONS);
  const hotAreas = useMemo(
    () => (grid ? computeHotAreas(grid.cells, layers?.areas ?? 0) : null),
    [grid, layers?.areas],
  );
  const plotPoints = useMemo<Detection[]>(
    () =>
      grid
        ? gridPlotPoints(grid.cells)
        : detections.map((d) => ({
            lat: d.lat,
            lon: d.lon,
            sensor: d.sensor === "viirs" ? "VIIRS" : "MODIS",
            dayNight: d.dayNight ?? null,
          })),
    [grid, detections],
  );
  const empty = !!query.data && (grid ? grid.cells.length === 0 : detections.length === 0);

  return (
    <div className="relative h-full w-full">
      {schematic ? (
        <RegionPlot
          region={region}
          detections={plotPoints}
          title={`Schematic map with ${plotPoints.length} fire detections in ${region.label} on ${date}`}
        />
      ) : (
        <FireMap
          detections={grid ? NO_DETECTIONS : detections}
          view={base}
          aoi={null}
          drawing={false}
          selectedId={null}
          onSelect={noop}
          showMatches={false}
          basemap={layers?.base ?? "streets"}
          plot={grid ? "hex" : (layers?.plot ?? "points")}
          hexCells={grid?.cells ?? null}
          hexRes={grid?.resolution}
          hotAreas={hotAreas}
          showPoints={grid ? false : (layers?.dots ?? true)}
          showHeat={layers?.heat ?? false}
          onViewport={(bbox) => setViewportState({ key: baseKey, bbox })}
          label={`Fire detection map of ${region.label} on ${date}. Drag to pan; use the + and − buttons to zoom.`}
        />
      )}
      {query.isFetching && (
        <p
          role="status"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-space-900/90 px-4 py-1.5 text-small"
        >
          Updating…
        </p>
      )}
      {query.isError && (
        <div className="absolute inset-x-3 top-3 z-10">
          <ErrorState
            title="Could not load the map"
            message={query.error instanceof Error ? query.error.message : undefined}
            onRetry={query.error instanceof ApiError && !query.error.recoverable ? undefined : () => void query.refetch()}
          />
        </div>
      )}
      {query.data?.truncated && (
        <p role="note" className="absolute bottom-12 inset-x-3 z-10 rounded-xl border border-space-600 bg-space-900/90 p-3 text-small text-ink-300">
          Partial result. Narrow the area to retrieve all cells for this day.
        </p>
      )}
      {outsideCoverage && (
        <p role="note" className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-xl border border-space-600 bg-space-900/90 p-3 text-center text-small text-ink-300">
          The spatial detection grid is unavailable for {date}. Harmonized calendar activity
          has independent coverage.
          {coverageQuery.data?.maxDate && ` Latest day with map detections: ${coverageQuery.data.maxDate}.`}
        </p>
      )}
      {empty && !outsideCoverage && !query.isFetching && (
        <p className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-xl border border-space-600 bg-space-900/90 p-3 text-center text-small text-ink-300">
          No detections recorded in this area.{" "}
          This does not mean there was no fire.
        </p>
      )}
    </div>
  );
}
