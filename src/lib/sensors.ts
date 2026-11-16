import type { SensorId } from "@/types/detections";

export const SENSORS: readonly SensorId[] = ["modis", "viirs"];

export const SENSOR_META: Record<
  SensorId,
  { label: string; symbol: string; hex: string; platforms: string }
> = {
  modis: { label: "MODIS", symbol: "◆", hex: "#ffb02e", platforms: "Terra and Aqua" },
  viirs: { label: "VIIRS", symbol: "●", hex: "#ff4a3d", platforms: "Suomi NPP and NOAA" },
};

export const HARMONIZED_META = {
  label: "Harmonized",
  symbol: "▲",
  hex: "#3aa6ff",
};
