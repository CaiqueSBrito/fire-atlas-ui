import { parseAsBoolean, parseAsStringLiteral } from "nuqs";
import { shiftDate, todayUtc } from "@/lib/utils/dates";

export const BASEMAPS = ["satellite", "vegetation", "illustrated"] as const;
export type BasemapId = (typeof BASEMAPS)[number];

export const BASEMAP_OPTIONS: ReadonlyArray<{
  id: BasemapId;
  label: string;
  description: string;
}> = [
  { id: "satellite", label: "Satélite", description: "Imagem real da Terra (NASA Blue Marble)" },
  { id: "vegetation", label: "Satélite + vegetação", description: "Índice de vegetação NDVI (MODIS, composto de 8 dias)" },
  { id: "illustrated", label: "Ilustrado", description: "Países e estados em tons de cinza" },
];

export const PLOTS = ["points", "hex"] as const;
export type PlotId = (typeof PLOTS)[number];

export const PLOT_OPTIONS: ReadonlyArray<{ id: PlotId; label: string; description: string }> = [
  { id: "points", label: "Pontos", description: "Uma marca por detecção; clique para ver os detalhes" },
  { id: "hex", label: "Hexágonos (H3)", description: "Contagem de focos por célula hexagonal" },
];

export const HEX_RAMP = ["#fff3b0", "#fdae61", "#f46d43", "#d73027", "#a50026"];

export const mapLayerParsers = {
  base: parseAsStringLiteral(BASEMAPS).withDefault("satellite"),
  heat: parseAsBoolean.withDefault(false),
  temp: parseAsBoolean.withDefault(false),
  plot: parseAsStringLiteral(PLOTS).withDefault("points"),
  dots: parseAsBoolean.withDefault(true),
};

export const IMAGERY_LAG_DAYS = 3;

export function imageryDateFor(to?: string, today: string = todayUtc()): string {
  const limit = shiftDate(today, -IMAGERY_LAG_DAYS);
  return to && to < limit ? to : limit;
}

export function temperatureDateFor(to?: string, today: string = todayUtc()): string {
  return to && to < today ? to : today;
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

export const TEMPERATURE_STOPS: ReadonlyArray<{ t: number; hex: string }> = [
  { t: -10, hex: "#3b4cc0" },
  { t: 0, hex: "#4b6cd6" },
  { t: 10, hex: "#2bb5a0" },
  { t: 18, hex: "#4cc84c" },
  { t: 25, hex: "#f4e04d" },
  { t: 31, hex: "#f5a623" },
  { t: 36, hex: "#e8412c" },
  { t: 43, hex: "#8b0a0a" },
];

const T_MIN = TEMPERATURE_STOPS[0].t;
const T_MAX = TEMPERATURE_STOPS[TEMPERATURE_STOPS.length - 1].t;

export const TEMPERATURE_RAMP = {
  colors: TEMPERATURE_STOPS.map((s) => `${s.hex} ${(((s.t - T_MIN) / (T_MAX - T_MIN)) * 100).toFixed(1)}%`),
  low: "≤ −10 °C",
  mid: "25 °C",
  high: "≥ 43 °C",
};

export const NDVI_RAMP = {
  colors: ["#d7c4b3", "#ac8d73", "#a0c031", "#4e9400", "#0a6900", "#001801"],
  low: "NDVI 0,1",
  mid: "0,5",
  high: "NDVI 1,0",
};
