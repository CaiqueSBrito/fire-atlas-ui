import type { TemperatureBasis, TemperatureBin } from "@/types/calendar";

const BIN_COLOR: Record<string, string> = {
  none: "#2a3558",
  lt320: "#5a2a1a",
  "320": "#a8401f",
  "330": "#e5242b",
  "340": "#ff4a3d",
  "350": "#ffb02e",
  ge360: "#ffd166",
};

export const NO_BINS_COLOR = "#aab4d4";

export const BASIS_LABEL: Record<TemperatureBasis, string> = {
  viirs: "VIIRS, channel I-4",
  aqua: "MODIS Aqua, channels 21/22",
  terra: "MODIS Terra, channels 21/22",
};

export const binColor = (key: string) => BIN_COLOR[key] ?? NO_BINS_COLOR;

export function binLabel({ fromK, toK }: Pick<TemperatureBin, "fromK" | "toK">): string {
  if (fromK === null && toK === null) return "Not measured";
  if (fromK === null) return `< ${toK} K`;
  if (toK === null) return `≥ ${fromK} K`;
  return `${fromK}–${toK} K`;
}

const COOL_TO_HOT = ["none", "lt320", "320", "330", "340", "350", "ge360"];

export function stackOrder(bins: TemperatureBin[]): TemperatureBin[] {
  const rank = (k: string) => {
    const i = COOL_TO_HOT.indexOf(k);
    return i === -1 ? COOL_TO_HOT.length : i;
  };
  return [...bins].sort((a, b) => rank(a.key) - rank(b.key));
}

const fmt = [
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }),
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }),
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }),
];

export function formatActivity(value: number): string {
  const abs = Math.abs(value);
  return fmt[abs < 10 ? 0 : abs < 100 ? 1 : 2].format(value);
}
