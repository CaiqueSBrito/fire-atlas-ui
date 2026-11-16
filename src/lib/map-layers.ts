import { parseAsBoolean, parseAsInteger, parseAsStringLiteral } from "nuqs";
import { shiftDate, todayUtc } from "@/lib/utils/dates";

export const BASEMAPS = ["streets", "satellite", "vegetation", "illustrated"] as const;
export type BasemapId = (typeof BASEMAPS)[number];

export const BASEMAP_OPTIONS: ReadonlyArray<{
  id: BasemapId;
  label: string;
  description: string;
}> = [
  { id: "streets", label: "Streets (OpenStreetMap)", description: "Street map with city, state, and highway names" },
  { id: "satellite", label: "Satellite", description: "Earth imagery (NASA Blue Marble)" },
  { id: "vegetation", label: "Satellite + vegetation", description: "NDVI vegetation index (MODIS, 8-day composite)" },
  { id: "illustrated", label: "Illustrated", description: "Countries and states in grayscale" },
];

export const PLOTS = ["points", "hex"] as const;
export type PlotId = (typeof PLOTS)[number];

export const PLOT_OPTIONS: ReadonlyArray<{ id: PlotId; label: string; description: string }> = [
  { id: "points", label: "Points", description: "One marker per detection; click for details" },
  { id: "hex", label: "Hexagons (H3)", description: "Hotspot count per hexagonal cell" },
];

export const HEX_RAMP = ["#fff3b0", "#fdae61", "#f46d43", "#d73027", "#a50026"];

export const FORECAST_RAMP = ["#ffc9c4", "#ff8a80", "#ff4a3d", "#d7261e", "#8b0d0d"];

export const mapLayerParsers = {
  base: parseAsStringLiteral(BASEMAPS).withDefault("streets"),
  heat: parseAsBoolean.withDefault(false),
  plot: parseAsStringLiteral(PLOTS).withDefault("points"),
  dots: parseAsBoolean.withDefault(true),
  areas: parseAsInteger.withDefault(0),
  forecast: parseAsBoolean.withDefault(false),
};

export const TERRAIN_TILES =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

export const TERRAIN_3D = { zoom: 10.5, pitch: 60, bearing: -20, exaggeration: 1.6 };

export const GLOBE_MAX_ZOOM = 1.8;
export const FLAT_MAX_ZOOM = 14;

const WORLD_TILE_PX = 512;

export function flatMinZoom(containerWidth: number): number {
  return Math.max(0, Math.log2(Math.max(1, containerWidth) / WORLD_TILE_PX));
}

export const GLOBE_CENTER: [number, number] = [-35, 12];

export const GLOBE_PROJECTION = {
  type: ["interpolate", ["linear"], ["zoom"], GLOBE_MAX_ZOOM, "vertical-perspective", 2.4, "mercator"],
};

export function globeZoom(width: number, height: number): number {
  const zoom = Math.log2((0.75 * Math.min(width, height) * Math.PI) / 512);
  return Math.max(0.5, Math.min(GLOBE_MAX_ZOOM, zoom));
}

export const STREETS_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export const IMAGERY_LAG_DAYS = 3;

export function imageryDateFor(to?: string, today: string = todayUtc()): string {
  const limit = shiftDate(today, -IMAGERY_LAG_DAYS);
  return to && to < limit ? to : limit;
}

const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

export const gibsTiles = {
  vegetation: (date: string) =>
    `${GIBS}/MODIS_Terra_NDVI_8Day/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
};

const hex2 = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
const gray = (level: number) => `#${hex2(level)}${hex2(level + 1)}${hex2(level + 3)}`;

export const ILLUSTRATED_PALETTE = {
  ocean: gray(222),
  countries: [143, 153, 134, 160, 146, 155, 138, 164, 148].map(gray),
  states: [163, 141, 176, 151, 168, 154, 179, 143, 160, 173, 147, 166, 152].map(gray),
  countryLine: "#ffffff",
  stateLine: "#ffffff",
  fallback: gray(147),
};

export const HEAT_RAMP = ["#3b4cc0", "#6dbcdb", "#fee08b", "#f46d43", "#a50026"];

export const NDVI_RAMP = {
  colors: ["#d7c4b3", "#ac8d73", "#a0c031", "#4e9400", "#0a6900", "#001801"],
  low: "NDVI 0.1",
  mid: "0.5",
  high: "NDVI 1.0",
};
