"use client";

import { useState } from "react";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { useDetections } from "@/hooks/use-detections";
import { useResolvedFilters } from "@/hooks/use-filters";
import { useMapLayers } from "@/hooks/use-map-layers";
import { useTemperature } from "@/hooks/use-temperature";
import { ApiError } from "@/lib/api/client";
import { imageryDateFor } from "@/lib/map-layers";
import type { HexCell, HexInfo } from "@/lib/utils/hex";
import { formatBboxParam } from "@/lib/utils/bbox";
import { AreaPanel } from "./area-panel";
import { DetectionDetail } from "./detection-detail";
import { DetectionList } from "./detection-list";
import { HexDetail, HexTopList } from "./hex-detail";
import { FireMap } from "./fire-map-loader";
import { LayerPanel } from "./layer-panel";
import { MapLegend } from "./map-legend";

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-md shadow-2xl">{children}</div>
    </div>
  );
}

export function MapExplorer() {
  const { data, error, isPending, isFetching, refetch, filters, enabled } =
    useDetections();
  const { setRaw } = useResolvedFilters();
  const [layers, setLayers] = useMapLayers();
  const imageryDate = imageryDateFor(filters.to);
  const temperature = useTemperature(layers.temp);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [hexInfo, setHexInfo] = useState<HexInfo | null>(null);
  const [hexPicked, setHexPicked] = useState<HexCell | null>(null);
  const hexSelected = hexInfo && hexPicked?.res === hexInfo.res ? hexPicked : null;

  const items = data?.items ?? [];
  const selected = items.find((d) => d.id === selectedId) ?? null;
  const matchesAvailable = Boolean(data?.harmonization.available);
  const counts = {
    modis: items.filter((d) => d.sensor === "modis").length,
    viirs: items.filter((d) => d.sensor === "viirs").length,
  };

  const applyArea = (b: Parameters<typeof formatBboxParam>[0]) => {
    setDrawing(false);
    void setRaw({ bbox: formatBboxParam(b), region: null });
  };

  let overlay: React.ReactNode = null;
  if (filters.problem) {
    overlay = (
      <ErrorState
        title="Filtro inválido"
        message={`${filters.problem} Ajuste os filtros para consultar.`}
      />
    );
  } else if (filters.sensors.length === 0) {
    overlay = (
      <EmptyState
        title="Nenhum sensor selecionado"
        description="Ative MODIS e/ou VIIRS nos filtros para ver as detecções."
      />
    );
  } else if (enabled && isPending) {
    overlay = <LoadingState label="Carregando detecções…" />;
  } else if (error) {
    overlay = (
      <ErrorState
        message={error.message}
        onRetry={
          error instanceof ApiError && !error.recoverable
            ? undefined
            : () => void refetch()
        }
      />
    );
  } else if (data && data.items.length === 0) {
    overlay = (
      <EmptyState
        title="Nenhuma detecção registrada neste recorte"
        description="Isso não significa que não houve fogo: satélites têm limites de cobertura, passagem e nuvens. Tente ampliar a área ou o período."
      />
    );
  }

  const pickPoint = (id: string | null) => {
    setSelectedId(id);
    if (id) setHexPicked(null);
  };

  const pickHex = (cell: HexCell | null) => {
    setHexPicked(cell);
    if (cell) setSelectedId(null);
  };

  const detailPanel =
    hexSelected && data ? (
      <HexDetail
        cell={hexSelected}
        shown={data.items.length}
        total={data.total}
        truncated={data.truncated}
        onClose={() => setHexPicked(null)}
      />
    ) : selected && data ? (
      <DetectionDetail
        detection={selected}
        source={data.source}
        matchesAvailable={matchesAvailable}
        onClose={() => setSelectedId(null)}
      />
    ) : null;

  const showDetections = layers.plot === "points" || layers.dots;

  const hint =
    layers.plot === "hex"
      ? layers.dots
        ? "Selecione um hexágono (contagem por sensor) ou um ponto (localização, data e hora, sensor e FRP) no mapa ou nas listas."
        : "Selecione um hexágono no mapa (ou na lista) para ver a contagem de focos por sensor."
      : "Selecione um ponto no mapa (ou na lista) para ver localização, data e hora, sensor e FRP.";

  return (
    <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col lg:flex-row">
      <h1 className="sr-only">Mapa de focos de calor</h1>

      <div className="relative order-1 min-h-[62svh] flex-1 lg:order-2 lg:min-h-[calc(100svh-9.5rem)]">
        <FireMap
          detections={items}
          view={filters.bbox}
          aoi={filters.customArea ? filters.bbox : null}
          drawing={drawing}
          onDrawn={applyArea}
          selectedId={selected?.id ?? null}
          onSelect={pickPoint}
          showMatches={matchesAvailable}
          plot={layers.plot}
          showPoints={layers.dots}
          selectedHex={hexSelected?.id ?? null}
          onHexSelect={pickHex}
          onHexChange={setHexInfo}
          basemap={layers.base}
          showHeat={layers.heat}
          showTemperature={layers.temp}
          imageryDate={imageryDate}
          temperature={layers.temp ? (temperature.data ?? null) : null}
          label="Mapa de focos de calor. Arraste para deslocar; use os botões + e − para o zoom. A lista de detecções no painel é uma alternativa por teclado."
        />
        {overlay && <Overlay>{overlay}</Overlay>}
        {isFetching && !isPending && (
          <p
            role="status"
            className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-space-900/90 px-4 py-1.5 text-small"
          >
            Atualizando…
          </p>
        )}
      </div>

      <aside
        aria-label="Painel do mapa"
        className="order-2 flex w-full flex-col gap-5 border-t border-space-600 bg-space-900 p-4 lg:order-1 lg:max-h-[calc(100svh-9.5rem)] lg:w-[22rem] lg:overflow-y-auto lg:border-r lg:border-t-0"
      >
        <p className="rounded-xl border border-space-600 bg-space-800 p-3 text-small text-ink-300">
          <strong className="text-ink-100">Atenção:</strong> nenhum ponto no mapa
          não comprova ausência de incêndio.
        </p>

        {detailPanel}

        {data && (
          <p className="font-mono text-small">
            {data.total.toLocaleString("pt-BR")} detecções no recorte
            {data.truncated && (
              <span className="block text-caption text-ink-300">
                Exibindo {data.items.length.toLocaleString("pt-BR")} pontos. Restrinja
                a área ou o período para ver todos.
              </span>
            )}
          </p>
        )}

        <LayerPanel
          base={layers.base}
          plot={layers.plot}
          dots={layers.dots}
          heat={layers.heat}
          temperature={layers.temp}
          imageryDate={imageryDate}
          temperatureState={
            layers.temp
              ? {
                  status: temperature.isError ? "error" : temperature.data ? "ready" : "loading",
                  date: temperature.date,
                  message: temperature.error?.message,
                  onRetry: () => void temperature.refetch(),
                }
              : undefined
          }
          onChange={(next) => void setLayers(next)}
        />

        <MapLegend
          counts={data ? counts : undefined}
          enabled={filters.sensors}
          showMatches={matchesAvailable}
          basemap={layers.base}
          showHeat={layers.heat}
          showTemperature={layers.temp}
          plot={layers.plot}
          hexInfo={hexInfo}
        />

        <AreaPanel
          key={formatBboxParam(filters.bbox)}
          bbox={filters.bbox}
          customArea={filters.customArea}
          drawing={drawing}
          onToggleDraw={() => setDrawing((v) => !v)}
          onApply={applyArea}
          onClear={() => void setRaw({ bbox: null })}
        />

        {!detailPanel && <p className="text-small text-ink-300">{hint}</p>}

        {layers.plot === "hex" && hexInfo && (
          <HexTopList cells={hexInfo.top} selectedId={hexSelected?.id ?? null} onSelect={pickHex} />
        )}

        {data && showDetections && (
          <DetectionList
            items={items}
            total={data.total}
            selectedId={selected?.id ?? null}
            onSelect={pickPoint}
          />
        )}

        {data?.source.simulated && (
          <p className="rounded-xl border border-dashed border-ember-400/60 p-3 text-caption text-ink-300">
            Protótipo: {data.source.name}. Defina <code>NEXT_PUBLIC_API_URL</code>{" "}
            para usar a API.
          </p>
        )}
      </aside>
    </main>
  );
}
