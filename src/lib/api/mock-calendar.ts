// Adaptador SIMULADO do calendário. Usado apenas enquanto NEXT_PUBLIC_API_URL
// não está definida. Tudo que sai daqui carrega `source.simulated = true` e a
// interface exibe o aviso "dados simulados". Determinístico por data+região.

import { getRegion } from "@/config/regions";
import { daysInMonth, todayUtc } from "@/lib/utils/dates";
import type {
  DayResponse,
  DayStatus,
  Detection,
  MonthResponse,
  PassTime,
  SensorCounts,
} from "@/types/calendar";

const SOURCE = { name: "Dados simulados (protótipo)", simulated: true };

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REGION_WEIGHT: Record<string, number> = { world: 12, brasil: 4 };

function simulateDay(date: string, regionId: string) {
  const region = getRegion(regionId);
  const rand = rng(`${date}|${region.id}`);
  const roll = rand();
  let base: DayStatus;
  if (date > todayUtc() || roll < 0.12) base = "unavailable";
  else if (roll < 0.3) base = "none";
  else base = "activity";

  const detections: Detection[] = [];
  if (base === "activity") {
    const total = Math.floor((3 + rand() * 30) * (REGION_WEIGHT[region.id] ?? 1));
    const [w, s, e, n] = region.bbox;
    const centers = Array.from({ length: 3 }, () => ({
      x: w + rand() * (e - w),
      y: s + rand() * (n - s),
    }));
    for (let i = 0; i < total; i++) {
      const c = centers[Math.floor(rand() * centers.length)];
      const jx = ((rand() + rand() + rand()) / 3 - 0.5) * (e - w) * 0.6;
      const jy = ((rand() + rand() + rand()) / 3 - 0.5) * (n - s) * 0.6;
      detections.push({
        lon: Math.min(e, Math.max(w, c.x + jx)),
        lat: Math.min(n, Math.max(s, c.y + jy)),
        sensor: rand() < 0.7 ? "VIIRS" : "MODIS",
        dayNight: rand() < 0.6 ? "D" : "N",
      });
    }
  }
  return { base, detections };
}

function countBySensor(detections: Detection[]): SensorCounts {
  return {
    MODIS: detections.filter((d) => d.sensor === "MODIS").length,
    VIIRS: detections.filter((d) => d.sensor === "VIIRS").length,
  };
}

const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(signal.reason);
    });
  });

export async function mockMonth(
  month: string,
  region: string,
  signal?: AbortSignal,
): Promise<MonthResponse> {
  await delay(250, signal);
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, "0")}`;
    const { base, detections } = simulateDay(date, region);
    return base === "activity"
      ? { date, status: base, counts: countBySensor(detections) }
      : { date, status: base };
  });
  return { month, region, days, source: SOURCE };
}

export async function mockDay(
  date: string,
  region: string,
  passTime: PassTime,
  signal?: AbortSignal,
): Promise<DayResponse> {
  await delay(250, signal);
  const { base, detections } = simulateDay(date, region);
  if (base === "unavailable") {
    return {
      date, region, passTime, status: base,
      detections: [], imagery: [], source: SOURCE,
    };
  }
  const filtered =
    passTime === "all"
      ? detections
      : detections.filter((d) => d.dayNight === (passTime === "day" ? "D" : "N"));
  return {
    date,
    region,
    passTime,
    status: filtered.length > 0 ? "activity" : "none",
    counts: countBySensor(filtered),
    detections: filtered,
    imagery: [], // o protótipo não inventa imagens (RN07)
    source: SOURCE,
  };
}
