"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
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
  BASEMAPS,
  HEAT_RAMP,
  ILLUSTRATED_PALETTE,
  gibsTiles,
  imageryDateFor,
  type BasemapId,
} from "@/lib/map-layers";
import { SENSOR_META, SENSORS } from "@/lib/sensors";
import { fieldBounds, type TemperatureGrid } from "@/lib/utils/temperature-field";
import { loadCountries, temperatureImage } from "@/lib/utils/temperature-image";
import type { Bbox, FireDetection, SensorId } from "@/types/detections";
import type { ForecastArea } from "@/types/forecast";

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

const EMPTY: FC = { type: "FeatureCollection", features: [] };

const ILLUSTRATED_LAYERS = ["ill-countries-fill", "ill-states-fill", "ill-states-line", "ill-countries-line"];

const BLANK_IMAGE = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

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

function ensureTempBorders(map: MlMap) {
  if (map.getLayer("temp-borders")) return;
  ensureCountries(map);
  map.addLayer(
    {
      id: "temp-borders",
      type: "line",
      source: "ill-countries",
      layout: { visibility: "none" },
      paint: {
        "line-color": "#1b2430",
        "line-opacity": 0.65,
        "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.5, 6, 1.4],
      },
    } as never,
    "heat",
  );
}

function ensureIllustrated(map: MlMap) {
  if (map.getSource("ill-states")) return;
  ensureCountries(map);
  map.addSource("ill-states", { type: "geojson", data: "/data/states.geojson" });
  const before = "temperature";
  const layers = [
    { id: "ill-countries-fill", type: "fill", source: "ill-countries", paint: { "fill-color": matchColor("c9", ILLUSTRATED_PALETTE.countries, ILLUSTRATED_PALETTE.fallback) } },
    { id: "ill-states-fill", type: "fill", source: "ill-states", paint: { "fill-color": matchColor("c13", ILLUSTRATED_PALETTE.states, ILLUSTRATED_PALETTE.fallback) } },
    { id: "ill-states-line", type: "line", source: "ill-states", paint: { "line-color": ILLUSTRATED_PALETTE.stateLine, "line-opacity": 0.55, "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.7, 6, 1.8] } },
    { id: "ill-countries-line", type: "line", source: "ill-countries", paint: { "line-color": ILLUSTRATED_PALETTE.countryLine, "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.7, 6, 1.8] } },
  ];
  for (const layer of layers) map.addLayer(layer as never, before);
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
  forecastAreas?: ForecastArea[];
  label: string;
  basemap?: BasemapId;
  showHeat?: boolean;
  showTemperature?: boolean;
  imageryDate?: string;
  temperature?: TemperatureGrid | null;
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
  forecastAreas,
  label,
  basemap = BASEMAPS[0],
  showHeat = false,
  showTemperature = false,
  imageryDate,
  temperature = null,
}: FireMapProps) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const cb = useRef({ onSelect, onDrawn });
  const drawingRef = useRef(drawing);
  const firstView = useRef(true);
  const imageryRef = useRef(imageryDate ?? imageryDateFor());

  useEffect(() => {
    cb.current = { onSelect, onDrawn };
    drawingRef.current = drawing;
  });

  useEffect(() => {
    if (!box.current) return;
    const map = new MlMap({
      container: box.current,
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
      maxZoom: 12,
    });
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.on("error", (e) => {
      const err = e.error as { status?: number } | undefined;
      if ((e as { sourceId?: string }).sourceId || err?.status) return;
      console.warn(e.error);
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");

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
      map.addSource("temperature", {
        type: "image",
        url: BLANK_IMAGE,
        coordinates: [[-180, 85], [180, 85], [180, -85], [-180, -85]],
      });
      map.addLayer({
        id: "temperature",
        type: "raster",
        source: "temperature",
        paint: { "raster-opacity": 0.92, "raster-fade-duration": 0 },
        layout: { visibility: "none" },
      });
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
      map.addSource("forecast", { type: "geojson", data: EMPTY as never });
      map.addLayer({
        id: "forecast-fill",
        type: "fill",
        source: "forecast",
        paint: { "fill-color": "#c4a1ff", "fill-opacity": 0.18 },
      });
      map.addLayer({
        id: "forecast-line",
        type: "line",
        source: "forecast",
        paint: { "line-color": "#c4a1ff", "line-width": 2, "line-dasharray": [1, 1.5] },
      });
      setReady(true);
    });

    const hit = (e: MapMouseEvent) =>
      map.queryRenderedFeatures(
        [
          [e.point.x - 8, e.point.y - 8],
          [e.point.x + 8, e.point.y + 8],
        ],
        { layers: ["viirs", "modis"] },
      );
    map.on("click", (e) => {
      if (drawingRef.current) return;
      const id = hit(e)[0]?.properties?.id;
      cb.current.onSelect(typeof id === "string" ? id : null);
    });
    map.on("mousemove", (e) => {
      if (drawingRef.current) return;
      map.getCanvas().style.cursor = hit(e).length ? "pointer" : "";
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
    setData(map, "heat", {
      type: "FeatureCollection",
      features: detections.map((d) => ({
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
  }, [detections, showMatches, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const animate = !firstView.current && !reduceMotion();
    firstView.current = false;
    map.resize();
    map.fitBounds(
      [
        [view[0], view[1]],
        [view[2], view[3]],
      ],
      { padding: 24, duration: animate ? 900 : 0, maxZoom: 8 },
    );
  }, [view, ready]);

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
    const illustrated = basemap === "illustrated";
    if (illustrated) ensureIllustrated(map);
    setVisibility(map, "base", !illustrated);
    setVisibility(map, "vegetation", basemap === "vegetation");
    for (const id of ILLUSTRATED_LAYERS) setVisibility(map, id, illustrated);
    map.setPaintProperty("bg", "background-color", illustrated ? ILLUSTRATED_PALETTE.ocean : "#04060c");
    setVisibility(map, "temp-borders", showTemperature && !illustrated);
  }, [basemap, showTemperature, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setVisibility(map, "heat", showHeat);
    setVisibility(map, "temperature", showTemperature);
    if (showTemperature) {
      ensureTempBorders(map);
      setVisibility(map, "temp-borders", basemap !== "illustrated");
    }
  }, [showHeat, showTemperature, basemap, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !showTemperature || !temperature) return;
    let cancelled = false;
    void loadCountries().then((countries) => {
      if (cancelled) return;
      const [w, s, e, n] = fieldBounds(temperature);
      type ImageSource = { updateImage: (o: { url: string; coordinates: number[][] }) => void };
      (map.getSource("temperature") as unknown as ImageSource | undefined)?.updateImage({
        url: temperatureImage(temperature, countries),
        coordinates: [[w, n], [e, n], [e, s], [w, s]],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [temperature, showTemperature, ready]);

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
    if (!map || !ready) return;
    setData(map, "forecast", {
      type: "FeatureCollection",
      features: (forecastAreas ?? []).map((a) => polygon(a.bbox, { id: a.id })),
    });
  }, [forecastAreas, ready]);

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
