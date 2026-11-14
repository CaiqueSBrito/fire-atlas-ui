import type { HexCell } from "@/lib/utils/hex";

export type SensorId = "modis" | "viirs";

export type Bbox = [number, number, number, number];

export type DataOrigin = {
  name: string;
  simulated: boolean;
};

export type FireDetection = {
  id: string;
  lat: number;
  lon: number;
  datetime: string;
  sensor: SensorId;
  platform?: string | null;
  frp: number | null;
  confidence?: string | null;
  dayNight?: "D" | "N" | null;
  matchId?: string | null;
};

export type DetectionGrid = {
  resolution: number;
  maxResolution?: number;
  cells: HexCell[];
};

export type DetectionsResponse = {
  items: FireDetection[];
  grid?: DetectionGrid | null;
  total: number;
  truncated: boolean;
  harmonization: { available: boolean };
  source: DataOrigin;
};

export type DetectionQuery = {
  sensors: SensorId[];
  from: string;
  to: string;
  bbox: Bbox;
};
