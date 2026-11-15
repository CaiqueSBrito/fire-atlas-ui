"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { QueryErrorState } from "@/components/feedback/query-error-state";
import type { Region } from "@/config/regions";
import { FireMap } from "@/features/map/components/fire-map-loader";
import { useQueryArea } from "@/hooks/use-query-area";
import { useRegionKey } from "@/hooks/use-region-key";
import { fetchDetections } from "@/lib/api/detections";
import type { BasemapId, PlotId } from "@/lib/map-layers";
import { SENSORS } from "@/lib/sensors";
import { gridPlotPoints } from "@/lib/utils/hex";
import { computeHotAreas } from "@/lib/utils/hot-areas";
import type { Detection } from "@/types/calendar";
import type { Bbox } from "@/types/detections";
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
  const queryRegion = useRegionKey(area, "cells", true);

  const query = useQuery({
    queryKey: ["calendar", "day-grid", date, queryRegion.key],
    queryFn: ({ signal }) =>
      fetchDetections({ sensors: [...SENSORS], from: date, to: date, bbox: area }, null, signal),
    enabled: queryRegion.ready,
    placeholderData: keepPreviousData,
  });

  const grid = query.data?.grid ?? null;
  const detections = query.data?.items ?? NO_DETECTIONS;
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
          label={`${grid?.harmonized ? "Mapa da atividade harmonizada" : "Mapa de focos"} de ${region.label} em ${date}. Arraste para deslocar; use os botões + e − para o zoom.`}
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
          <QueryErrorState
            title="Não foi possível carregar o mapa"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        </div>
      )}
      {query.data?.truncated && (
        <p role="note" className="absolute bottom-12 inset-x-3 z-10 rounded-xl border border-space-600 bg-space-900/90 p-3 text-small text-ink-300">
          Resultado parcial. Reduza a área para consultar todas as células deste dia.
        </p>
      )}
      {empty && !query.isFetching && (
        <p className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-xl border border-space-600 bg-space-900/90 p-3 text-center text-small text-ink-300">
          {grid?.harmonized
            ? "Nenhuma atividade harmonizada registrada neste recorte."
            : "Nenhuma detecção registrada neste recorte."}{" "}
          Isso não significa que não houve fogo.
        </p>
      )}
    </div>
  );
}
