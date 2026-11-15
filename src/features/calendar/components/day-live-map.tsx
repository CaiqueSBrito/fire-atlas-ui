"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ErrorState } from "@/components/feedback/error-state";
import type { Region } from "@/config/regions";
import { FireMap } from "@/features/map/components/fire-map-loader";
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
  const area = base;
  const queryRegion = useMemo(() => regionQueryKey(area, true), [area]);
  const coverageQuery = useDetectionCoverage();
  const outsideCoverage = hasApi && !!coverageQuery.data && !isCovered(coverageQuery.data, date);

  const query = useQuery({
    queryKey: ["calendar", "day-grid", date, queryRegion],
    queryFn: ({ signal }) =>
      fetchDetections({ sensors: [...SENSORS], from: date, to: date, bbox: area }, null, signal),
    enabled: !hasApi || (!coverageQuery.isPending && !outsideCoverage),
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
          title={`Mapa esquemático com ${plotPoints.length} pontos de fogo em ${region.label} em ${date}`}
        />
      ) : (
        <FireMap
          detections={grid ? NO_DETECTIONS : detections}
          interactive={false}
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
          label={`Mapa fixo de focos de ${region.label} em ${date}.`}
        />
      )}
      {query.isFetching && (
        <p
          role="status"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-space-900/90 px-4 py-1.5 text-small"
        >
          Atualizando…
        </p>
      )}
      {query.isError && (
        <div className="absolute inset-x-3 top-3 z-10">
          <ErrorState
            title="Não foi possível carregar o mapa"
            message={query.error instanceof Error ? query.error.message : undefined}
            onRetry={query.error instanceof ApiError && !query.error.recoverable ? undefined : () => void query.refetch()}
          />
        </div>
      )}
      {query.data?.truncated && (
        <p role="note" className="absolute bottom-12 inset-x-3 z-10 rounded-xl border border-space-600 bg-space-900/90 p-3 text-small text-ink-300">
          Resultado parcial. Reduza a área para consultar todas as células deste dia.
        </p>
      )}
      {outsideCoverage && (
        <p role="note" className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-xl border border-space-600 bg-space-900/90 p-3 text-center text-small text-ink-300">
          A grade espacial de detecções não está disponível para {date}. A atividade harmonizada do calendário
          tem cobertura independente.
          {coverageQuery.data?.maxDate && ` Último dia com detecções no mapa: ${coverageQuery.data.maxDate}.`}
        </p>
      )}
      {empty && !outsideCoverage && !query.isFetching && (
        <p className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-xl border border-space-600 bg-space-900/90 p-3 text-center text-small text-ink-300">
          Nenhuma detecção registrada neste recorte. Isso não significa que não houve fogo.
        </p>
      )}
    </div>
  );
}
