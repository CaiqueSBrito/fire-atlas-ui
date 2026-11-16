"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Map as MlMap,
  setWorkerUrl,
  NavigationControl,
  ScaleControl,
  type GeoJSONSource,
  type MapMouseEvent,
  type MapTouchEvent,
} from "maplibre-gl";
import {
  FLAT_MAX_ZOOM,
  FORECAST_RAMP,
  GLOBE_CENTER,
  GLOBE_MAX_ZOOM,
  GLOBE_PROJECTION,
  HEAT_RAMP,
  ILLUSTRATED_PALETTE,
  STREETS_STYLE_URL,
  TERRAIN_3D,
  TERRAIN_TILES,
  gibsTiles,
  globeZoom,
  flatMinZoom,
  imageryDateFor,
  type BasemapId,
  type PlotId,
} from "@/lib/map-layers";
import { SENSOR_META, SENSORS } from "@/lib/sensors";
import { getRegion } from "@/config/regions";
import { isSameBbox } from "@/lib/utils/bbox";
import { flatViewport } from "@/lib/utils/viewport-area";
import type { HotAreas } from "@/lib/utils/hot-areas";
import { continentAt, type ContinentId } from "@/lib/utils/continent";
import type { CountryCollection } from "@/lib/utils/countries";
import { existingLayers } from "@/lib/utils/map-query";
import {
  aggregateHex,
  colorFloor,
  hexColor,
  hexInfo,
  hexResolution,
  hexRing,
  type HexCell,
  type HexInfo,
} from "@/lib/utils/hex";
import { loadCountries } from "@/lib/utils/countries";
import type { Bbox, FireDetection, SensorId } from "@/types/detections";
import type { ForecastCell } from "@/types/forecast";

setWorkerUrl("/maplibre-gl-worker.mjs");

const BASE_TILES =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg";

type Geometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "Polygon"; coordinates: [number, number][][] };
type FC = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: Geometry;
    properties: Record<string, string | number>;
  }>;
};

const NO_CELLS: HexCell[] = [];
const EMPTY: FC = { type: "FeatureCollection", features: [] };

const ILLUSTRATED_LAYERS = ["ill-countries-fill", "ill-states-fill", "ill-states-line", "ill-countries-line"];

const POINTS_MIN_ZOOM_IN_HEX = 5;

const STREETS_PREFIX = "ofm-";

type StreetsStyle = {
  sprite?: string;
  glyphs?: string;
  sources: Record<string, Record<string, unknown>>;
  layers: Array<Record<string, unknown>>;
};

let streetsStyle: Promise<StreetsStyle> | null = null;
const streetsReady = new WeakMap<MlMap, Promise<void>>();

function loadStreetsStyle(): Promise<StreetsStyle> {
  streetsStyle ??= fetch(STREETS_STYLE_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`Street style unavailable (${r.status})`);
      return r.json() as Promise<StreetsStyle>;
    })
    .catch((error) => {
      streetsStyle = null;
      throw error;
    });
  return streetsStyle;
}

function ensureStreets(map: MlMap): Promise<void> {
  let ready = streetsReady.get(map);
  if (!ready) {
    ready = loadStreetsStyle().then((spec) => {
      if (spec.glyphs) map.setGlyphs(spec.glyphs);
      if (spec.sprite) map.setSprite(spec.sprite);
      for (const [id, source] of Object.entries(spec.sources)) {
        map.addSource(`${STREETS_PREFIX}${id}`, source as never);
      }
      for (const layer of spec.layers) {
        const copy: Record<string, unknown> = {
          ...layer,
          id: `${STREETS_PREFIX}${layer.id}`,
          layout: { ...(layer.layout as object | undefined), visibility: "none" },
        };
        if (layer.source) copy.source = `${STREETS_PREFIX}${layer.source}`;
        map.addLayer(copy as never, "vegetation");
      }
    });
    streetsReady.set(map, ready);
    ready.catch(() => streetsReady.delete(map));
  }
  return ready;
}

function setStreetsVisible(map: MlMap, visible: boolean) {
  for (const layer of map.getStyle().layers) {
    if (layer.id.startsWith(STREETS_PREFIX)) setVisibility(map, layer.id, visible);
  }
}


const matchColor = (prop: string, palette: string[], fallback: string) => [
  "match",
  ["to-number", ["coalesce", ["get", prop], 0]],
  ...palette.flatMap((color, i) => [i + 1, color]),
  fallback,
];

function ensureCountries(map: MlMap) {
  if (map.getSource("ill-countries")) return;
  map.addSource("ill-countries", {
    type: "geojson",
    data: "/data/countries.geojson",
    attribution: "Fronteiras © Natural Earth",
  });
}

function ensureIllustrated(map: MlMap) {
  if (map.getSource("ill-states")) return;
  ensureCountries(map);
  map.addSource("ill-states", { type: "geojson", data: "/data/states.geojson" });
  const before = "hex-fill";
  const layers = [
    { id: "ill-countries-fill", type: "fill", source: "ill-countries", paint: { "fill-color": matchColor("c9", ILLUSTRATED_PALETTE.countries, ILLUSTRATED_PALETTE.fallback) } },
    { id: "ill-states-fill", type: "fill", source: "ill-states", paint: { "fill-color": matchColor("c13", ILLUSTRATED_PALETTE.states, ILLUSTRATED_PALETTE.fallback) } },
    { id: "ill-states-line", type: "line", source: "ill-states", paint: { "line-color": ILLUSTRATED_PALETTE.stateLine, "line-opacity": 0.55, "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.7, 6, 1.8] } },
    { id: "ill-countries-line", type: "line", source: "ill-countries", paint: { "line-color": ILLUSTRATED_PALETTE.countryLine, "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.7, 6, 1.8] } },
  ];
  for (const layer of layers) map.addLayer(layer as never, before);
}

function ensureTerrain(map: MlMap) {
  if (map.getSource("dem")) return;
  map.addSource("dem", {
    type: "raster-dem",
    tiles: [TERRAIN_TILES],
    encoding: "terrarium",
    tileSize: 256,
    maxzoom: 15,
    attribution: "Relevo © Mapzen, AWS Terrain Tiles",
  });
  map.addLayer(
    {
      id: "hillshade",
      type: "hillshade",
      source: "dem",
      layout: { visibility: "none" },
      paint: {
        "hillshade-exaggeration": 0.45,
        "hillshade-shadow-color": "#000000",
        "hillshade-highlight-color": "#ffffff",
      },
    } as never,
    "hex-fill",
  );
}

function setVisibility(map: MlMap, id: string, visible: boolean) {
  if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
}

const polygon = ([w, s, e, n]: Bbox, props = {}): FC["features"][number] => ({
  type: "Feature",
  properties: props,
  geometry: {
    type: "Polygon",
    coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
  },
});

function setData(map: MlMap, id: string, data: FC) {
  (map.getSource(id) as GeoJSONSource | undefined)?.setData(
    data as unknown as Parameters<GeoJSONSource["setData"]>[0],
  );
}

function makeIcon(sensor: SensorId): ImageData {
  const size = 28;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = SENSOR_META[sensor].hex;
  g.strokeStyle = "#04060c";
  g.lineWidth = 3;
  g.beginPath();
  if (sensor === "modis") {
    g.moveTo(size / 2, 3);
    g.lineTo(size - 3, size / 2);
    g.lineTo(size / 2, size - 3);
    g.lineTo(3, size / 2);
    g.closePath();
  } else {
    g.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
  }
  g.stroke();
  g.fill();
  return g.getImageData(0, 0, size, size);
}

const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export type FireMapProps = {
  detections: FireDetection[];
  view: Bbox;
  aoi: Bbox | null;
  drawing: boolean;
  onDrawn?: (bbox: Bbox) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showMatches: boolean;
  label: string;
  interactive?: boolean;
  basemap?: BasemapId;
  showHeat?: boolean;
  imageryDate?: string;
  plot?: PlotId;
  hexCells?: HexCell[] | null;
  hexRes?: number;
  hotAreas?: HotAreas | null;
  showPoints?: boolean;
  selectedHex?: string | null;
  onHexSelect?: (cell: HexCell | null) => void;
  onHexChange?: (info: HexInfo | null) => void;
  introFly?: boolean;
  focus3d?: { lon: number; lat: number; zoom?: number } | null;
  projection?: "globe" | "mercator";
  continentPicking?: boolean;
  onContinentPick?: (id: ContinentId) => void;
  onContinentHover?: (id: ContinentId | null) => void;
  onViewport?: (bbox: Bbox) => void;
  forecastCells?: ForecastCell[] | null;
};

export default function FireMap({
  detections,
  view,
  aoi,
  drawing,
  onDrawn,
  selectedId,
  onSelect,
  showMatches,
  label,
  interactive = true,
  basemap = "satellite",
  showHeat = false,
  imageryDate,
  plot = "points",
  hexCells = null,
  hexRes,
  hotAreas = null,
  showPoints = true,
  selectedHex = null,
  onHexSelect,
  onHexChange,
  introFly = false,
  focus3d = null,
  projection = "mercator",
  continentPicking = false,
  onContinentPick,
  onContinentHover,
  onViewport,
  forecastCells = null,
}: FireMapProps) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(2);
  const plotRef = useRef(plot);
  const pointsRef = useRef(showPoints);
  const cellsRef = useRef<HexCell[]>([]);
  const cb = useRef({ onSelect, onDrawn, onHexSelect, onHexChange, onContinentPick, onContinentHover, onViewport });
  const drawingRef = useRef(drawing);
  const firstView = useRef(true);
  const introRef = useRef(introFly);
  const continentRef = useRef(continentPicking);
  const countriesRef = useRef<CountryCollection | null>(null);
  const lastHoverRef = useRef(0);
  const savedCamera = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const imageryRef = useRef(imageryDate ?? imageryDateFor());

  const interactiveRef = useRef(interactive);
  useEffect(() => {
    cb.current = { onSelect, onDrawn, onHexSelect, onHexChange, onContinentPick, onContinentHover, onViewport };
    continentRef.current = continentPicking;
    plotRef.current = plot;
    pointsRef.current = showPoints;
    drawingRef.current = drawing;
  });

  useEffect(() => {
    if (!box.current) return;
    const map = new MlMap({
      container: box.current,
      interactive: interactiveRef.current,
      style: {
        version: 8,
        sources: {
          base: {
            type: "raster",
            tiles: [BASE_TILES],
            tileSize: 256,
            maxzoom: 8,
            attribution: "Imagery © NASA GIBS / ESDIS",
          },
        },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": "#04060c" } },
          { id: "base", type: "raster", source: "base" },
        ],
      },
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
      ...(introRef.current ? { center: GLOBE_CENTER, zoom: 1.5 } : {}),
      maxZoom: FLAT_MAX_ZOOM,
    });
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.on("error", (e) => {
      const err = e.error as { status?: number } | undefined;
      if ((e as { sourceId?: string }).sourceId || err?.status) return;
      console.warn(e.error);
    });
    if (interactiveRef.current) map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("zoomend", () => setZoom(map.getZoom()));

    map.on("load", () => {
      const date = imageryRef.current;
      map.addSource("vegetation", {
        type: "raster",
        tiles: [gibsTiles.vegetation(date)],
        tileSize: 256,
        maxzoom: 9,
        attribution: "NDVI © NASA GIBS / MODIS",
      });
      map.addLayer({ id: "vegetation", type: "raster", source: "vegetation", paint: { "raster-opacity": 0.8 }, layout: { visibility: "none" } });
      map.addSource("hex", { type: "geojson", data: EMPTY as never });
      map.addLayer({
        id: "hex-fill",
        type: "fill",
        source: "hex",
        layout: { visibility: "none" },
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.72 },
      } as never);
      map.addLayer({
        id: "hex-line",
        type: "line",
        source: "hex",
        layout: { visibility: "none" },
        paint: { "line-color": "#ffffff", "line-opacity": 0.5, "line-width": 0.7 },
      } as never);
      map.addLayer({
        id: "hex-selected",
        type: "line",
        source: "hex",
        layout: { visibility: "none" },
        filter: ["==", ["get", "cell"], ""],
        paint: { "line-color": "#f2f5ff", "line-width": 3 },
      } as never);
      map.addSource("areas", { type: "geojson", data: EMPTY as never });
      map.addLayer({
        id: "areas-fill",
        type: "fill",
        source: "areas",
        layout: { visibility: "none" },
        paint: { "fill-color": "#ff4a3d", "fill-opacity": 0.08 },
      } as never);
      map.addLayer({
        id: "areas-halo",
        type: "line",
        source: "areas",
        layout: { visibility: "none", "line-join": "round" },
        paint: { "line-color": "#1a0f1f", "line-opacity": 0.55, "line-width": 5.5 },
      } as never);
      map.addLayer({
        id: "areas-line",
        type: "line",
        source: "areas",
        layout: { visibility: "none", "line-join": "round" },
        paint: { "line-color": "#ffffff", "line-opacity": 0.95, "line-width": 2.4 },
      } as never);
      const forecastColor = [
        "interpolate",
        ["linear"],
        ["get", "p"],
        ...FORECAST_RAMP.flatMap((c, i) => [i / (FORECAST_RAMP.length - 1), c]),
      ];
      map.addSource("forecast", { type: "geojson", data: EMPTY as never });
      map.addSource("forecast-points", { type: "geojson", data: EMPTY as never });
      map.addLayer({
        id: "forecast-fill",
        type: "fill",
        source: "forecast",
        minzoom: 5,
        layout: { visibility: "none" },
        paint: { "fill-color": forecastColor, "fill-opacity": 0.55 },
      } as never);
      map.addLayer({
        id: "forecast-line",
        type: "line",
        source: "forecast",
        minzoom: 5,
        layout: { visibility: "none" },
        paint: { "line-color": "#ff5a4f", "line-width": 1.4, "line-dasharray": [2, 1.5] },
      } as never);
      map.addLayer({
        id: "forecast-dot",
        type: "circle",
        source: "forecast-points",
        maxzoom: 5.5,
        layout: { visibility: "none" },
        paint: {
          "circle-color": forecastColor,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 2.5, 5, 5],
          "circle-stroke-color": "#1a0f2e",
          "circle-stroke-width": 1,
          "circle-opacity": 0.9,
        },
      } as never);
      map.addSource("heat", { type: "geojson", data: EMPTY as never });
      map.addLayer({
        id: "heat",
        type: "heatmap",
        source: "heat",
        layout: { visibility: "none" },
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["coalesce", ["get", "w"], 1], 0, 0.15, 150, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 6, 1.6],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 14, 4, 28, 8, 45],
          "heatmap-opacity": 0.85,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.15, HEAT_RAMP[0],
            0.35, HEAT_RAMP[1],
            0.55, HEAT_RAMP[2],
            0.8, HEAT_RAMP[3],
            1, HEAT_RAMP[4],
          ],
        },
      } as never);
      for (const sensor of SENSORS) {
        map.addImage(`icon-${sensor}`, makeIcon(sensor), { pixelRatio: 2 });
        map.addSource(sensor, { type: "geojson", data: EMPTY as never });
        map.addLayer({
          id: sensor,
          type: "symbol",
          source: sensor,
          layout: {
            "icon-image": `icon-${sensor}`,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });
      }
      map.addSource("matches", { type: "geojson", data: EMPTY as never });
      map.addLayer({
        id: "matches",
        type: "circle",
        source: "matches",
        paint: {
          "circle-radius": 11,
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      map.addSource("selected", { type: "geojson", data: EMPTY as never });
      map.addLayer({
        id: "selected",
        type: "circle",
        source: "selected",
        paint: {
          "circle-radius": 14,
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": "#f2f5ff",
          "circle-stroke-width": 3,
        },
      });
      map.addSource("aoi", { type: "geojson", data: EMPTY as never });
      map.addLayer({
        id: "aoi-fill",
        type: "fill",
        source: "aoi",
        paint: { "fill-color": "#3aa6ff", "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: "aoi-line",
        type: "line",
        source: "aoi",
        paint: { "line-color": "#3aa6ff", "line-width": 2, "line-dasharray": [3, 2] },
      });
      setZoom(map.getZoom());
      setReady(true);
    });

    const query = (geometry: Parameters<MlMap["queryRenderedFeatures"]>[0], ids: string[]) => {
      const layers = existingLayers(map, ids);
      return layers.length ? map.queryRenderedFeatures(geometry, { layers }) : [];
    };
    const hit = (e: MapMouseEvent) =>
      query(
        [
          [e.point.x - 8, e.point.y - 8],
          [e.point.x + 8, e.point.y + 8],
        ],
        ["viirs", "modis"],
      );
    map.on("click", (e) => {
      if (drawingRef.current) return;
      if (continentRef.current) {
        const continent = continentAt(e.lngLat.lng, e.lngLat.lat, countriesRef.current);
        if (continent) cb.current.onContinentPick?.(continent);
        return;
      }
      if (plotRef.current === "hex") {
        const pointId = pointsRef.current ? hit(e)[0]?.properties?.id : undefined;
        if (typeof pointId === "string") {
          cb.current.onSelect(pointId);
          return;
        }
        const feature = query(e.point, ["hex-fill"])[0];
        const cell = feature
          ? (cellsRef.current.find((c) => c.id === feature.properties?.cell) ?? null)
          : null;
        cb.current.onHexSelect?.(cell);
        if (!cell) cb.current.onSelect(null);
        return;
      }
      const id = hit(e)[0]?.properties?.id;
      cb.current.onSelect(typeof id === "string" ? id : null);
    });
    map.on("mousemove", (e) => {
      if (drawingRef.current) return;
      if (continentRef.current) {
        const now = performance.now();
        if (now - lastHoverRef.current < 80) return;
        lastHoverRef.current = now;
        const continent = continentAt(e.lngLat.lng, e.lngLat.lat, countriesRef.current);
        cb.current.onContinentHover?.(continent);
        map.getCanvas().style.cursor = continent ? "pointer" : "";
        return;
      }
      const hex = plotRef.current === "hex";
      const overHex = hex && query(e.point, ["hex-fill"]).length > 0;
      const overPoint = (!hex || pointsRef.current) && hit(e).length > 0;
      map.getCanvas().style.cursor = overHex || overPoint ? "pointer" : "";
    });

    map.on("mouseout", () => cb.current.onContinentHover?.(null));
    map.on("moveend", () => {
      const pitch = map.getPitch();
      if (pitch > 5) {
        const c = map.getCenter();
        const box = map.getContainer();
        cb.current.onViewport?.(
          flatViewport(
            [c.lng, c.lat],
            map.getZoom(),
            box.clientWidth,
            box.clientHeight,
            1 + pitch / 90,
          ),
        );
        return;
      }
      const b = map.getBounds();
      cb.current.onViewport?.([
        Math.max(-180, b.getWest()),
        Math.max(-85, b.getSouth()),
        Math.min(180, b.getEast()),
        Math.min(85, b.getNorth()),
      ]);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const sensor of SENSORS) {
      setData(map, sensor, {
        type: "FeatureCollection",
        features: detections
          .filter((d) => d.sensor === sensor)
          .map((d) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [d.lon, d.lat] },
            properties: { id: d.id },
          })),
      });
    }
    const heatMax = hexCells?.reduce((m, c) => Math.max(m, c.count), 1) ?? 1;
    setData(map, "heat", {
      type: "FeatureCollection",
      features: hexCells
        ? hexCells.map((c) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: c.center },
            properties: { w: Math.max(1, 150 * Math.sqrt(c.count / heatMax)) },
          }))
        : detections.map((d) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [d.lon, d.lat] },
            properties: { w: d.frp ?? 1 },
          })),
    });
    setData(map, "matches", {
      type: "FeatureCollection",
      features: showMatches
        ? detections
            .filter((d) => d.matchId)
            .map((d) => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: [d.lon, d.lat] },
              properties: { id: d.id },
            }))
        : [],
    });
  }, [detections, hexCells, showMatches, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setProjection((projection === "globe" ? GLOBE_PROJECTION : { type: "mercator" }) as never);
  }, [projection, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (projection === "globe") {
      map.setMinZoom(0);
      return;
    }
    const lockWorld = () =>
      map.setMinZoom(Math.min(flatMinZoom(map.getContainer().clientWidth), map.getMaxZoom()));
    map.once("moveend", lockWorld);
    map.on("resize", lockWorld);
    return () => {
      map.off("moveend", lockWorld);
      map.off("resize", lockWorld);
    };
  }, [projection, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const first = firstView.current;
    const intro = first && introRef.current;
    const animate = (!first || intro) && !reduceMotion();
    firstView.current = false;
    map.resize();
    map.setMaxZoom(FLAT_MAX_ZOOM);
    if (projection === "globe" && isSameBbox(view, getRegion("world").bbox)) {
      const { width, height } = map.getContainer().getBoundingClientRect();
      let cancelled = false;
      const lockGlobeZoom = () => {
        if (cancelled) return;
        if (map.getMinZoom() > GLOBE_MAX_ZOOM) map.setMinZoom(0);
        map.setMaxZoom(GLOBE_MAX_ZOOM);
      };
      map.once("moveend", lockGlobeZoom);
      map.flyTo({
        center: GLOBE_CENTER,
        zoom: globeZoom(width, height),
        pitch: 0,
        bearing: 0,
        duration: animate ? 1800 : 0,
      });
      return () => {
        cancelled = true;
        map.off("moveend", lockGlobeZoom);
      };
    }
    const fromGlobe = map.getZoom() < 2.3;
    map.fitBounds(
      [
        [view[0], view[1]],
        [view[2], view[3]],
      ],
      {
        padding: 24,
        duration: animate ? (intro ? 2600 : fromGlobe ? 2200 : 900) : 0,
        maxZoom: 8,
      },
    );
  }, [view, projection, ready]);

  useEffect(() => {
    if (!continentPicking) return;
    void loadCountries().then((loaded) => {
      countriesRef.current = loaded;
    });
  }, [continentPicking]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const d = detections.find((x) => x.id === selectedId);
    setData(map, "selected", {
      type: "FeatureCollection",
      features: d
        ? [{ type: "Feature", geometry: { type: "Point", coordinates: [d.lon, d.lat] }, properties: {} }]
        : [],
    });
    if (d && !map.getBounds().contains([d.lon, d.lat])) {
      map.easeTo({ center: [d.lon, d.lat], zoom: Math.max(map.getZoom(), 5), duration: reduceMotion() ? 0 : 600 });
    }
  }, [selectedId, detections, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const duration = reduceMotion() ? 0 : 1600;
    if (focus3d) {
      if (!savedCamera.current && map.getPitch() === 0) {
        const center = map.getCenter();
        savedCamera.current = { center: [center.lng, center.lat], zoom: map.getZoom() };
      }
      ensureTerrain(map);
      map.setTerrain({ source: "dem", exaggeration: TERRAIN_3D.exaggeration });
      setVisibility(map, "hillshade", true);
      map.easeTo({
        center: [focus3d.lon, focus3d.lat],
        zoom: Math.max(map.getZoom(), focus3d.zoom ?? TERRAIN_3D.zoom),
        pitch: TERRAIN_3D.pitch,
        bearing: TERRAIN_3D.bearing,
        duration,
      });
    } else if (map.getPitch() > 0 || map.getTerrain()) {
      map.setTerrain(null);
      setVisibility(map, "hillshade", false);
      const saved = savedCamera.current;
      savedCamera.current = null;
      map.easeTo({ ...(saved ?? {}), pitch: 0, bearing: 0, duration });
    }
  }, [focus3d, ready]);

  const cells = useMemo(() => {
    if (plot !== "hex") return NO_CELLS;
    return hexCells ?? aggregateHex(detections, hexResolution(zoom));
  }, [plot, hexCells, detections, zoom]);
  const cellRes = hexCells ? (hexRes ?? hexCells[0]?.res ?? 0) : hexResolution(zoom);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const hex = plot === "hex";
    for (const id of ["hex-fill", "hex-line", "hex-selected"]) setVisibility(map, id, hex);
    if (map.getLayer("hex-fill")) {
      const opacity = hotAreas
        ? ["case", [">=", ["get", "n"], hotAreas.threshold], 0.8, 0.1]
        : showHeat
          ? 0.3
          : 0.72;
      map.setPaintProperty("hex-fill", "fill-opacity", opacity as never);
    }
    const pointsVisible = (!hex || showPoints) && !showHeat;
    for (const id of [...SENSORS, "matches"]) setVisibility(map, id, pointsVisible);
    setVisibility(map, "selected", !hex || showPoints);
    for (const id of [...SENSORS, "matches", "selected"]) {
      if (map.getLayer(id)) map.setLayerZoomRange(id, hex ? POINTS_MIN_ZOOM_IN_HEX : 0, 24);
    }
    for (const sensor of SENSORS) {
      if (map.getLayer(sensor)) map.setLayoutProperty(sensor, "icon-size", hex ? 0.7 : 1);
    }
  }, [plot, showPoints, showHeat, hotAreas, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setData(map, "areas", {
      type: "FeatureCollection",
      features: (hotAreas?.areas ?? []).map((a) => ({
        type: "Feature",
        geometry: { type: "MultiPolygon", coordinates: a.polygon },
        properties: { id: a.id, n: a.count },
      })),
    } as never);
    const visible = Boolean(hotAreas) && plot === "hex";
    for (const id of ["areas-fill", "areas-halo", "areas-line"]) setVisibility(map, id, visible);
  }, [hotAreas, plot, ready]);

  useEffect(() => {
    cellsRef.current = cells;
    const map = mapRef.current;
    if (!map || !ready) return;
    const max = cells.reduce((m, c) => Math.max(m, c.count), 0);
    const floor = colorFloor(cells.map((c) => c.count), max);
    setData(map, "hex", {
      type: "FeatureCollection",
      features: cells.map((c) => ({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [hexRing(c.id)] },
        properties: { cell: c.id, n: c.count, color: hexColor(c.count, max, floor) },
      })),
    });
    cb.current.onHexChange?.(plot === "hex" ? hexInfo(cells, cellRes) : null);
  }, [cells, cellRes, plot, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getLayer("hex-selected")) return;
    map.setFilter("hex-selected", ["==", ["get", "cell"], selectedHex ?? ""] as never);
  }, [selectedHex, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const illustrated = basemap === "illustrated";
    const streets = basemap === "streets";
    if (illustrated) ensureIllustrated(map);
    setVisibility(map, "base", basemap === "satellite" || basemap === "vegetation" || streets);
    setVisibility(map, "vegetation", basemap === "vegetation");
    let cancelled = false;
    if (streets) {
      ensureStreets(map)
        .then(() => {
          if (cancelled) return;
          setStreetsVisible(map, true);
          setVisibility(map, "base", false);
        })
        .catch(() => undefined);
    } else if (streetsReady.has(map)) {
      setStreetsVisible(map, false);
    }
    for (const id of ILLUSTRATED_LAYERS) setVisibility(map, id, illustrated);
    map.setPaintProperty("bg", "background-color", illustrated ? ILLUSTRATED_PALETTE.ocean : "#04060c");
    return () => {
      cancelled = true;
    };
  }, [basemap, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setVisibility(map, "heat", showHeat);
  }, [showHeat, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const list = forecastCells ?? [];
    setData(map, "forecast", {
      type: "FeatureCollection",
      features: list.map((c) => ({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [hexRing(c.id)] },
        properties: { id: c.id, p: c.probability },
      })),
    } as never);
    setData(map, "forecast-points", {
      type: "FeatureCollection",
      features: list.map((c) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [c.lon, c.lat] },
        properties: { id: c.id, p: c.probability },
      })),
    } as never);
    for (const id of ["forecast-fill", "forecast-line", "forecast-dot"]) {
      setVisibility(map, id, Boolean(forecastCells));
    }
  }, [forecastCells, ready]);

  useEffect(() => {
    const date = imageryDate ?? imageryDateFor();
    imageryRef.current = date;
    const map = mapRef.current;
    if (!map || !ready) return;
    type Tiled = { setTiles: (tiles: string[]) => void };
    (map.getSource("vegetation") as unknown as Tiled | undefined)?.setTiles([gibsTiles.vegetation(date)]);
  }, [imageryDate, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setData(map, "aoi", aoi ? { type: "FeatureCollection", features: [polygon(aoi)] } : EMPTY);
  }, [aoi, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !drawing) return;
    map.dragPan.disable();
    map.getCanvas().style.cursor = "crosshair";
    let start: [number, number] | null = null;
    const rect = (a: [number, number], b: [number, number]): Bbox => [
      Math.max(-180, Math.min(a[0], b[0])),
      Math.max(-90, Math.min(a[1], b[1])),
      Math.min(180, Math.max(a[0], b[0])),
      Math.min(90, Math.max(a[1], b[1])),
    ];
    type Ev = MapMouseEvent | MapTouchEvent;
    const point = (e: Ev): [number, number] => [e.lngLat.lng, e.lngLat.lat];
    const down = (e: Ev) => {
      start = point(e);
    };
    const move = (e: Ev) => {
      if (start) setData(map, "aoi", { type: "FeatureCollection", features: [polygon(rect(start, point(e)))] });
    };
    const up = (e: Ev) => {
      if (!start) return;
      const b = rect(start, point(e));
      start = null;
      if (b[2] - b[0] > 0.05 && b[3] - b[1] > 0.05) cb.current.onDrawn?.(b);
    };
    map.on("mousedown", down);
    map.on("touchstart", down);
    map.on("mousemove", move);
    map.on("touchmove", move);
    map.on("mouseup", up);
    map.on("touchend", up);
    return () => {
      map.off("mousedown", down);
      map.off("touchstart", down);
      map.off("mousemove", move);
      map.off("touchmove", move);
      map.off("mouseup", up);
      map.off("touchend", up);
      map.dragPan.enable();
      map.getCanvas().style.cursor = "";
    };
  }, [drawing, ready]);

  return (
    <div className="absolute inset-0">
      <div
        ref={box}
        role="region"
        aria-label={label}
        className="h-full w-full"
      />
    </div>
  );
}
