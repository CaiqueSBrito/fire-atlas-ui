import type {
  DayResponse,
  DayStatus,
  Detection,
  Imagery,
  MonthResponse,
  PassTime,
} from "@/types/calendar";

export const SOURCE = { name: "Fonte de teste", simulated: true };

/**
 * Regra do mês de teste (determinística): dia % 3 === 1 → atividade,
 * === 2 → nenhum registro, === 0 → indisponível.
 */
export function statusOfDay(date: string): DayStatus {
  const day = Number(date.slice(8, 10));
  if (day % 3 === 1) return "activity";
  if (day % 3 === 2) return "none";
  return "unavailable";
}

export function makeMonth(month: string, region = "brasil"): MonthResponse {
  const total = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  ).getUTCDate();
  return {
    month,
    region,
    source: SOURCE,
    days: Array.from({ length: total }, (_, i) => {
      const date = `${month}-${String(i + 1).padStart(2, "0")}`;
      const status = statusOfDay(date);
      return status === "activity"
        ? { date, status, counts: { MODIS: 16, VIIRS: 44 } }
        : { date, status };
    }),
  };
}

export function makeDetections(modis: number, viirs: number): Detection[] {
  return [
    ...Array.from({ length: modis }, (_, i) => ({
      lat: -10 - i * 0.1,
      lon: -50 - i * 0.1,
      sensor: "MODIS" as const,
      dayNight: "D" as const,
    })),
    ...Array.from({ length: viirs }, (_, i) => ({
      lat: -12 - i * 0.1,
      lon: -52 - i * 0.1,
      sensor: "VIIRS" as const,
      dayNight: "N" as const,
    })),
  ];
}

export function makeDay(
  date: string,
  region = "brasil",
  passTime: PassTime = "all",
  imagery: Imagery[] = [],
): DayResponse {
  const status = statusOfDay(date);
  const base = { date, region, passTime, imagery, source: SOURCE };
  if (status === "activity") {
    return {
      ...base,
      status,
      counts: { MODIS: 3, VIIRS: 5 },
      detections: makeDetections(3, 5),
    };
  }
  if (status === "none") {
    return { ...base, status, counts: { MODIS: 0, VIIRS: 0 }, detections: [] };
  }
  return { ...base, status, detections: [] };
}

export const THERMAL: Imagery = {
  kind: "thermal",
  url: "https://example.test/thermal.png",
  source: "NASA GIBS",
  date: "2026-11-04",
};

export const GEOGRAPHIC: Imagery = {
  kind: "geographic",
  url: "https://example.test/geo.png",
  source: "Sentinel-2",
  date: "2026-11-04",
};
