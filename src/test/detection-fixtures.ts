import type { DetectionsResponse, FireDetection } from "@/types/detections";
import type { StatsResponse } from "@/types/stats";

export const detection = (over: Partial<FireDetection> = {}): FireDetection => ({
  id: "modis-1",
  lat: -10.5,
  lon: -55.25,
  datetime: "2026-11-08T14:30:00Z",
  sensor: "modis",
  platform: "Terra",
  frp: 42.5,
  confidence: "85",
  dayNight: "D",
  matchId: null,
  ...over,
});

export const detectionsResponse = (
  over: Partial<DetectionsResponse> = {},
): DetectionsResponse => {
  const items = over.items ?? [
    detection(),
    detection({ id: "viirs-1", sensor: "viirs", frp: 120, platform: "NOAA-20" }),
    detection({ id: "viirs-2", sensor: "viirs", frp: null }),
  ];
  return {
    items,
    total: items.length,
    truncated: false,
    harmonization: { available: false },
    source: { name: "Fonte de teste", simulated: true },
    ...over,
  };
};

export const statsResponse = (over: Partial<StatsResponse> = {}): StatsResponse => ({
  bySensor: { modis: 1200, viirs: 3400 },
  series: [
    { date: "2026-11-06", modis: 100, viirs: 200 },
    { date: "2026-11-07", modis: 150, viirs: 250 },
    { date: "2026-11-08", modis: 120, viirs: 300 },
  ],
  source: { name: "Fonte de teste", simulated: true },
  ...over,
});

export const temperatureGrid = (): import("@/lib/utils/temperature-field").TemperatureGrid => ({
  lons: [-60, -50, -40],
  lats: [10, 0, -10],
  values: [
    [28, 30, 31],
    [26, 29, 33],
    [22, 25, 27],
  ],
  date: "2026-11-10",
  min: 22,
  max: 33,
});
