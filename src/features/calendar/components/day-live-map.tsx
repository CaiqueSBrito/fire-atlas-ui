"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ErrorState } from "@/components/feedback/error-state";
import type { Region } from "@/config/regions";
import { FireMap } from "@/features/map/components/fire-map-loader";
import { useQueryArea } from "@/hooks/use-query-area";
import { fetchDetections } from "@/lib/api/detections";
import type { BasemapId, PlotId } from "@/lib/map-layers";
import { SENSORS } from "@/lib/sensors";
import { computeHotAreas } from "@/lib/utils/hot-areas";
import type { Bbox } from "@/types/detections";

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
}: {
  region: Region;
  date: string;
  viewBbox?: Bbox | null;
  layers?: DayMapLayers;
}) {
  const base = viewBbox ?? region.bbox;
  const baseKey = base.join(",");
  const [viewportState, setViewportState] = useState<{ key: string; bbox: Bbox } | null>(null);
  const viewport = viewportState?.key === baseKey ? viewportState.bbox : null;
  const area = useQueryArea(viewport, base, true);

  const query = useQuery({
    queryKey: ["calendar", "day-grid", date, area],
    queryFn: ({ signal }) =>
      fetchDetections({ sensors: [...SENSORS], from: date, to: date, bbox: area }, null, signal),
    placeholderData: keepPreviousData,
  });

  const grid = query.data?.grid ?? null;
  const hotAreas = useMemo(
    () => (grid ? computeHotAreas(grid.cells, layers?.areas ?? 0) : null),
    [grid, layers?.areas],
  );

  return (
    <div className="relative h-full w-full">
      <FireMap
        detections={NO_DETECTIONS}
        view={base}
        aoi={null}
        drawing={false}
        selectedId={null}
        onSelect={noop}
        showMatches={false}
        basemap={layers?.base ?? "streets"}
        plot="hex"
        hexCells={grid?.cells ?? null}
        hexRes={grid?.resolution}
        hotAreas={hotAreas}
        showPoints={false}
        showHeat={layers?.heat ?? false}
        onViewport={(bbox) => setViewportState({ key: baseKey, bbox })}
        label={`Mapa de focos de ${region.label} em ${date}. Arraste para deslocar; use os botões + e − para o zoom.`}
      />
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
            onRetry={() => void query.refetch()}
          />
        </div>
      )}
      {query.data && grid && grid.cells.length === 0 && !query.isFetching && (
        <p className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-xl border border-space-600 bg-space-900/90 p-3 text-center text-small text-ink-300">
          Nenhuma detecção registrada neste recorte. Isso não significa que não houve fogo.
        </p>
      )}
    </div>
  );
}
