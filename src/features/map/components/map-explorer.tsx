"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { QueryErrorState } from "@/components/feedback/query-error-state";
import { useDetections, useMapForecast } from "@/hooks/use-detections";
import { useResolvedFilters } from "@/hooks/use-filters";
import { useMapLayers } from "@/hooks/use-map-layers";
import { useQueryArea } from "@/hooks/use-query-area";
import { useDrawMode } from "@/providers/draw-mode";
import { hasApi } from "@/lib/api/client";
import { getRegion } from "@/config/regions";
import { imageryDateFor } from "@/lib/map-layers";
import type { ContinentId } from "@/lib/utils/continent";
import { hexFocusZoom, sameHexInfo, type HexCell, type HexInfo } from "@/lib/utils/hex";
import { computeHotAreas } from "@/lib/utils/hot-areas";
import { clearIntroFly, peekIntroFly } from "@/lib/utils/intro-fly";
import { formatBboxParam } from "@/lib/utils/bbox";
import { hexBbox, saveMapPlace } from "@/lib/utils/map-place";
import type { Bbox, FireDetection } from "@/types/detections";
import { DetectionDetail } from "./detection-detail";
import { DetectionList } from "./detection-list";
import { HexDetail, HexTopList } from "./hex-detail";
import { FireMap } from "./fire-map-loader";
import { ForecastLayerList } from "./forecast-layer-list";
import { Group, LayerPanel } from "./layer-panel";
import { MapLegend } from "./map-legend";

const NO_ITEMS: FireDetection[] = [];

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-md shadow-2xl">{children}</div>
    </div>
  );
}

export function MapExplorer() {
  const { setRaw, filters: current } = useResolvedFilters();
  const regionKey = `${current.regionId}|${formatBboxParam(current.bbox)}`;
  const [viewportState, setViewportState] = useState<{ key: string; bbox: Bbox } | null>(null);
  const viewport = viewportState?.key === regionKey ? viewportState.bbox : null;
  const queryArea = useQueryArea(viewport, current.bbox, hasApi && !current.customArea);
  const { data, error, isPending, isFetching, refetch, filters, enabled } =
    useDetections(queryArea);
  const [layers, setLayers] = useMapLayers();
  const forecastQuery = useMapForecast(queryArea, layers.forecast);
  const forecast =
    layers.forecast && forecastQuery.data?.status === "available" ? forecastQuery.data : null;
  const imageryDate = imageryDateFor(filters.to);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus3d, setFocus3d] = useState<{ lon: number; lat: number; zoom?: number } | null>(null);
  const [hoverContinent, setHoverContinent] = useState<ContinentId | null>(null);
  const mode3d = focus3d !== null;
  const globe = filters.regionId === "world" && !filters.customArea;
  const [introFly] = useState(peekIntroFly);
  const { drawing, setDrawing } = useDrawMode();
  const [panelOpen, setPanelOpen] = useState(true);
  const [hexInfo, setHexInfo] = useState<HexInfo | null>(null);
  const [hexPicked, setHexPicked] = useState<HexCell | null>(null);
  const hexSelected =
    hexPicked && (mode3d || (hexInfo && hexPicked.res === hexInfo.res)) ? hexPicked : null;

  const items = data?.items ?? NO_ITEMS;
  const grid = data?.grid ?? null;
  const plot = grid ? "hex" : layers.plot;
  const hotAreas = useMemo(
    () => (grid ? computeHotAreas(grid.cells, layers.areas) : null),
    [grid, layers.areas],
  );
  const finestLevel =
    grid?.maxResolution !== undefined && grid.resolution >= grid.maxResolution && grid.cells.length > 0
      ? grid.maxResolution
      : null;
  const selected = items.find((d) => d.id === selectedId) ?? null;
  const matchesAvailable = Boolean(data?.harmonization.available);
  useEffect(() => {
    clearIntroFly();
  }, []);
  const counts = grid
    ? {
        modis: grid.cells.reduce((acc, c) => acc + c.modis, 0),
        viirs: grid.cells.reduce((acc, c) => acc + c.viirs, 0),
      }
    : {
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
    overlay = <QueryErrorState error={error} onRetry={() => void refetch()} />;
  } else if (data && (grid ? grid.cells.length === 0 : data.items.length === 0)) {
    overlay = (
      <EmptyState
        title="Nenhuma detecção registrada neste recorte"
        description="Isso não significa que não houve fogo: satélites têm limites de cobertura, passagem e nuvens. Tente ampliar a área ou o período."
      />
    );
  }

  const exit3d = () => setFocus3d(null);

  const pickPoint = (id: string | null) => {
    setSelectedId(id);
    const point = id ? items.find((d) => d.id === id) : undefined;
    if (point) {
      setHexPicked(null);
      setFocus3d({ lon: point.lon, lat: point.lat });
    } else {
      setFocus3d(null);
    }
  };

  const pickHex = (cell: HexCell | null) => {
    setHexPicked(cell);
    if (cell) {
      setSelectedId(null);
      setFocus3d({ lon: cell.center[0], lat: cell.center[1], zoom: hexFocusZoom(cell.res) });
    } else {
      setFocus3d(null);
    }
  };

  const pickContinent = (id: ContinentId) => {
    setHoverContinent(null);
    void setRaw({ region: id, bbox: null }, { history: "push" });
  };

  const detailPanel =
    hexSelected && data ? (
      <HexDetail
        cell={hexSelected}
        shown={data.items.length}
        total={data.total}
        truncated={grid ? false : data.truncated}
        view3d={mode3d}
        onToggle3d={() =>
          mode3d
            ? exit3d()
            : setFocus3d({
                lon: hexSelected.center[0],
                lat: hexSelected.center[1],
                zoom: hexFocusZoom(hexSelected.res),
              })
        }
        onClose={() => pickHex(null)}
        harmonizedUnit={grid?.harmonized?.unitLabel}
        period={grid?.harmonized ? { from: filters.from, to: filters.to } : undefined}
      />
    ) : selected && data ? (
      <DetectionDetail
        detection={selected}
        source={data.source}
        matchesAvailable={matchesAvailable}
        view3d={mode3d}
        onToggle3d={() =>
          mode3d ? exit3d() : setFocus3d({ lon: selected.lon, lat: selected.lat })
        }
        onClose={() => pickPoint(null)}
      />
    ) : null;

  const showDetections = !grid && (layers.plot === "points" || layers.dots);

  const place: Bbox | null = hexSelected
    ? hexBbox(hexSelected.id)
    : selected
      ? [selected.lon - 0.25, selected.lat - 0.25, selected.lon + 0.25, selected.lat + 0.25]
      : (viewport ?? (filters.customArea ? filters.bbox : null));
  const placeParam = place ? formatBboxParam(place) : null;
  const calendarParams = new URLSearchParams({ region: filters.regionId, date: filters.to });
  if (placeParam) calendarParams.set("bbox", placeParam);
  if (layers.base !== "streets") calendarParams.set("base", layers.base);
  if (plot !== "points") calendarParams.set("plot", plot);
  if (!layers.dots) calendarParams.set("dots", "false");
  if (layers.heat) calendarParams.set("heat", "true");
  if (layers.areas) calendarParams.set("areas", String(layers.areas));
  const calendarHref = `/explore/calendar?${calendarParams.toString()}`;

  useEffect(() => {
    if (placeParam) saveMapPlace({ region: filters.regionId, bbox: placeParam.split(",").map(Number) as Bbox });
  }, [placeParam, filters.regionId]);

  const mapProps = {
    detections: items,
    view: filters.bbox,
    aoi: filters.customArea ? filters.bbox : null,
    drawing,
    onDrawn: applyArea,
    selectedId: selected?.id ?? null,
    onSelect: pickPoint,
    showMatches: matchesAvailable,
    plot,
    hexCells: grid?.cells ?? null,
    hexRes: grid?.resolution,
    hotAreas,
    showPoints: grid ? false : layers.dots,
    selectedHex: hexSelected?.id ?? null,
    onHexSelect: pickHex,
    onHexChange: (info: HexInfo | null) => setHexInfo((prev) => (sameHexInfo(prev, info) ? prev : info)),
    basemap: layers.base,
    showHeat: layers.heat,
    imageryDate,
    onViewport: (bbox: Bbox) => setViewportState({ key: regionKey, bbox }),
    forecastCells: forecast?.cells ?? null,
    label:
      "Mapa de focos de calor. Arraste para deslocar; use os botões + e − para o zoom. A lista de detecções no painel é uma alternativa por teclado.",
  };

  return (
    <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col lg:flex-row">
      <h1 className="sr-only">Mapa de focos de calor</h1>

      <div className="relative order-1 min-h-[62svh] flex-1 lg:order-2 lg:min-h-[calc(100svh-9.5rem)]">
        <FireMap
          {...mapProps}
          introFly={introFly}
          focus3d={focus3d}
          projection={globe ? "globe" : "mercator"}
          continentPicking={globe}
          onContinentPick={pickContinent}
          onContinentHover={setHoverContinent}
        />
        {overlay && <Overlay>{overlay}</Overlay>}
        {data?.truncated && (
          <p role="note" className="absolute inset-x-4 top-4 z-10 rounded-xl border border-space-600 bg-space-900/95 p-3 text-small text-ink-300">
            Resultado parcial. Reduza a área ou o período para consultar todas as células.
          </p>
        )}
        <details className="group absolute bottom-10 right-4 z-10 w-72 max-w-[calc(100%-2rem)] rounded-3xl border border-space-600 bg-space-900/95 shadow-lg">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-base font-semibold leading-6 tracking-[-0.02em] [&::-webkit-details-marker]:hidden">
            Legenda e avisos
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-ink-300 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <div className="flex max-h-[55svh] flex-col gap-4 overflow-y-auto px-4 pb-4">
            <p className="rounded-xl border border-space-600 bg-space-800 p-3 text-small text-ink-300">
              <strong className="text-ink-100">Atenção:</strong> nenhum ponto no mapa
              não comprova ausência de incêndio.
            </p>
            {data && (
              <p className="font-mono text-small">
                {grid?.harmonized
                  ? `${data.total.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} de atividade harmonizada no recorte`
                  : `${data.total.toLocaleString("pt-BR")} detecções no recorte`}
                {data.truncated && (
                  <span className="block text-caption text-ink-300">
                    Exibindo{" "}
                    {(grid ? grid.cells.length : data.items.length).toLocaleString("pt-BR")}{" "}
                    {grid ? "células" : "pontos"}. Restrinja a área ou o período para ver
                    todos.
                  </span>
                )}
              </p>
            )}
            {hotAreas && (
              <p className="rounded-xl border border-space-600 bg-space-800 p-3 text-small text-ink-300">
                <span aria-hidden className="mr-1 inline-block h-3 w-5 rounded-sm border-2 border-white align-middle" />
                Contorno branco: <strong className="text-ink-100">área de calor</strong>, células com ao menos{" "}
                {hotAreas.threshold.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{" "}
                {grid?.harmonized ? "de atividade harmonizada" : "focos"} (as {hotAreas.share}% mais intensas). As demais
                ficam esmaecidas.
              </p>
            )}
            <MapLegend
              counts={data ? counts : undefined}
              enabled={filters.sensors}
              showMatches={matchesAvailable}
              basemap={layers.base}
              showHeat={layers.heat}
              plot={plot}
              hexInfo={hexInfo}
              harmonizedUnit={grid?.harmonized?.unitLabel}
              forecastIssue={forecast?.issueDate ?? null}
            />
            {data?.source.simulated && (
              <p className="rounded-xl border border-dashed border-ember-400/60 p-3 text-caption text-ink-300">
                Protótipo: {data.source.name}. Defina <code>NEXT_PUBLIC_API_URL</code>{" "}
                para usar a API.
              </p>
            )}
          </div>
        </details>
        {!panelOpen && (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            aria-controls="painel-mapa"
            aria-expanded="false"
            className="absolute bottom-4 left-4 z-10 inline-flex h-12 items-center gap-2 rounded-full border-2 border-ember-400 bg-space-900/95 px-4 text-base font-semibold leading-6 tracking-[-0.02em] text-ink-100 shadow-lg transition-colors duration-200 hover:bg-space-800"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-ember-400" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Mostrar painel
          </button>
        )}
        <div className="absolute left-4 top-4 z-10 flex flex-col items-start gap-2">
          {!globe && (
          <button
                type="button"
                onClick={() => {
                  setFocus3d(null);
                  setSelectedId(null);
                  setHexPicked(null);
                  void setRaw({ region: null, bbox: null }, { history: "push" });
                }}
                className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-ember-400 bg-space-900/95 px-4 text-base font-semibold leading-6 tracking-[-0.02em] text-ink-100 shadow-lg transition-colors duration-200 hover:bg-space-800"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 text-ember-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
                </svg>
                Voltar ao globo
              </button>
          )}
          <Link
            href={calendarHref}
            aria-label="Abrir o calendário neste ponto do mapa"
            className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-ember-400 bg-space-900/95 px-4 text-base font-semibold leading-6 tracking-[-0.02em] text-ink-100 shadow-lg transition-colors duration-200 hover:bg-space-800"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 text-ember-400" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            Calendário
          </Link>
        </div>
        {globe && (
          <p
            aria-live="polite"
            className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-space-900/90 px-4 py-1.5 text-small"
          >
            {hoverContinent
              ? `Clique para explorar: ${getRegion(hoverContinent).label}`
              : "Clique em um continente para explorar"}
          </p>
        )}
        {drawing && (
          <div
            role="status"
            className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border-2 border-ember-400 bg-space-900/95 py-1.5 pl-5 pr-2 text-base font-semibold leading-6 tracking-[-0.02em] shadow-lg"
          >
            Arraste no mapa para desenhar a área
            <button
              type="button"
              onClick={() => setDrawing(false)}
              className="h-9 rounded-full px-4 text-small text-ink-300 transition-colors duration-200 hover:bg-space-800 hover:text-ink-100"
            >
              Cancelar
            </button>
          </div>
        )}
        {finestLevel !== null && grid && (
          <p
            role="note"
            className="pointer-events-none absolute bottom-14 left-1/2 z-10 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full bg-space-900/90 px-4 py-1.5 text-center text-caption text-ink-300"
          >
            Nível mais fino disponível (H3 {finestLevel}, hexágonos de ≈{" "}
            {(grid.cells[0].edgeKm * 2).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km).
            Aproximar mais não traz mais detalhe.
          </p>
        )}
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
        id="painel-mapa"
        aria-label="Painel do mapa"
        hidden={!panelOpen}
        className="order-2 flex w-full flex-col gap-5 rounded-t-[32px] border border-space-600 bg-space-900 p-4 text-small leading-5 tracking-[-0.03em] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:order-1 lg:m-3 lg:max-h-[calc(100svh-10.5rem)] lg:w-[16.5rem] lg:shrink-0 lg:self-start lg:overflow-y-auto lg:rounded-[32px]"
      >
        <button
          type="button"
          onClick={() => setPanelOpen(false)}
          aria-controls="painel-mapa"
          aria-expanded="true"
          className="inline-flex min-h-11 items-center justify-between gap-2 rounded-full border border-space-600 px-4 text-small font-semibold hover:border-ink-300"
        >
          Ocultar painel
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>

        {detailPanel}

        <LayerPanel
          base={layers.base}
          plot={plot}
          gridOnly={grid ? { resolution: grid.resolution } : null}
          dots={layers.dots}
          heat={layers.heat}
          forecast={hasApi ? layers.forecast : undefined}
          onChange={(next) => void setLayers(next)}
        />

        {layers.forecast && hasApi && (
          <Group title="Previsão">
            {forecastQuery.isPending ? (
              <p role="status" className="text-small text-ink-300">Carregando a previsão…</p>
            ) : forecastQuery.isError ? (
              <ErrorState
                title="Não foi possível carregar a previsão"
                message={forecastQuery.error.message}
                onRetry={() => void forecastQuery.refetch()}
              />
            ) : forecastQuery.data?.status === "unavailable" ? (
              <p className="rounded-xl border border-dashed border-space-600 p-3 text-small text-ink-300">
                <strong className="text-ink-100">Previsão indisponível.</strong> {forecastQuery.data.reason}
              </p>
            ) : forecast ? (
              <ForecastLayerList
                cells={forecast.cells}
                issueDate={forecast.issueDate}
                truncated={forecast.truncated}
              />
            ) : null}
          </Group>
        )}

        <Group title="Detecções" open={false}>
          {plot === "hex" && hexInfo && (
            <HexTopList
              cells={hexInfo.top}
              selectedId={hexSelected?.id ?? null}
              onSelect={pickHex}
              harmonized={!!grid?.harmonized}
            />
          )}
          {data && showDetections && (
            <DetectionList
              items={items}
              total={data.total}
              selectedId={selected?.id ?? null}
              onSelect={pickPoint}
            />
          )}
        </Group>
      </aside>
    </main>
  );
}
