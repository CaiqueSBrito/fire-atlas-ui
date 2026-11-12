import { ApiError } from "./client";
import { bboxContains } from "@/lib/utils/bbox";
import { shiftDate } from "@/lib/utils/dates";
import type {
  Bbox,
  DetectionQuery,
  DetectionsResponse,
  FireDetection,
  SensorId,
} from "@/types/detections";

export type MockMode = "error" | "empty" | null;

export const MOCK_SOURCE = {
  name: "Dados simulados (protótipo) · posições aproximadas",
  simulated: true,
} as const;

export const MOCK_ITEM_CAP = 2500;
const MAX_DAYS = 366;

type Cluster = {
  id: string;
  c: [number, number];
  s: [number, number];
  weight: number;
  peakDoy: number;
};

const CLUSTERS: Cluster[] = [
  { id: "amazonia", c: [-58, -8], s: [6, 3.5], weight: 3, peakDoy: 250 },
  { id: "cerrado", c: [-48, -14], s: [3.5, 3.5], weight: 2.2, peakDoy: 245 },
  { id: "africa-central", c: [22, -6], s: [8, 4], weight: 3, peakDoy: 215 },
  { id: "africa-sul", c: [28, -14], s: [6, 3], weight: 2, peakDoy: 240 },
  { id: "australia", c: [146, -28], s: [8, 5], weight: 1.5, peakDoy: 330 },
  { id: "siberia", c: [105, 60], s: [14, 4], weight: 1.2, peakDoy: 200 },
  { id: "california", c: [-120, 38], s: [3, 2.5], weight: 0.8, peakDoy: 230 },
  { id: "indonesia", c: [113, -2], s: [6, 3], weight: 1.6, peakDoy: 260 },
  { id: "india", c: [78, 22], s: [7, 4], weight: 1.4, peakDoy: 90 },
  { id: "mediterraneo", c: [22, 39], s: [9, 2.5], weight: 0.7, peakDoy: 215 },
];

const SENSOR_FACTOR: Record<SensorId, number> = { modis: 22, viirs: 38 };

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand: () => number): number {
  const u = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

function cdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

function dayOfYear(date: string): number {
  const d = new Date(`${date}T00:00:00Z`);
  return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5);
}

export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let d = from;
  while (d <= to && out.length < MAX_DAYS) {
    out.push(d);
    d = shiftDate(d, 1);
  }
  return out;
}

function fractionInside(cl: Cluster, [w, s, e, n]: Bbox): number {
  const fx = cdf((e - cl.c[0]) / cl.s[0]) - cdf((w - cl.c[0]) / cl.s[0]);
  const fy = cdf((n - cl.c[1]) / cl.s[1]) - cdf((s - cl.c[1]) / cl.s[1]);
  return Math.max(0, fx * fy);
}

function clusterCount(
  date: string,
  sensor: SensorId,
  cl: Cluster,
  bbox: Bbox,
): number {
  const seasonal =
    0.55 + 0.45 * Math.cos((2 * Math.PI * (dayOfYear(date) - cl.peakDoy)) / 365);
  const noise = 0.6 + 0.8 * rng(hash(`${date}|${sensor}|${cl.id}`))();
  return Math.round(
    SENSOR_FACTOR[sensor] * cl.weight * seasonal * noise * fractionInside(cl, bbox),
  );
}

export function dailyCounts(
  from: string,
  to: string,
  sensors: SensorId[],
  bbox: Bbox,
): Array<{ date: string } & Partial<Record<SensorId, number>>> {
  return daysBetween(from, to).map((date) => {
    const row: { date: string } & Partial<Record<SensorId, number>> = { date };
    for (const sensor of sensors) {
      row[sensor] = CLUSTERS.reduce(
        (sum, cl) => sum + clusterCount(date, sensor, cl, bbox),
        0,
      );
    }
    return row;
  });
}

const PLATFORMS: Record<SensorId, string[]> = {
  modis: ["Terra", "Aqua"],
  viirs: ["Suomi NPP", "NOAA-20"],
};

function makeDetection(
  date: string,
  sensor: SensorId,
  cl: Cluster,
  bbox: Bbox,
  rand: () => number,
  index: number,
): FireDetection {
  let lon = 0;
  let lat = 0;
  for (let tries = 0; tries < 30; tries++) {
    lon = cl.c[0] + normal(rand) * cl.s[0];
    lat = cl.c[1] + normal(rand) * cl.s[1];
    if (bboxContains(bbox, lon, lat)) break;
  }
  lon = Math.min(Math.max(lon, bbox[0]), bbox[2]);
  lat = Math.min(Math.max(lat, bbox[1]), bbox[3]);

  const hh = String(Math.floor(rand() * 24)).padStart(2, "0");
  const mm = String(Math.floor(rand() * 60)).padStart(2, "0");
  const night = rand() > 0.55;
  return {
    id: `${sensor}-${date}-${cl.id}-${index}`,
    lat: Number(lat.toFixed(4)),
    lon: Number(lon.toFixed(4)),
    datetime: `${date}T${hh}:${mm}:00Z`,
    sensor,
    platform: PLATFORMS[sensor][Math.floor(rand() * 2)],
    frp: rand() < 0.06 ? null : Number((3 + Math.exp(normal(rand) * 0.9 + 2.2)).toFixed(1)),
    confidence:
      sensor === "modis"
        ? String(40 + Math.floor(rand() * 60))
        : ["low", "nominal", "high"][Math.floor(rand() * 3)],
    dayNight: night ? "N" : "D",
    matchId: null,
  };
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

export async function mockDetections(
  q: DetectionQuery,
  mock: MockMode,
  signal?: AbortSignal,
): Promise<DetectionsResponse> {
  await wait(600, signal);
  if (mock === "error") {
    throw new ApiError("Simulação: o servidor está indisponível.");
  }
  const base = { harmonization: { available: false }, source: MOCK_SOURCE };
  if (mock === "empty") {
    return { items: [], total: 0, truncated: false, ...base };
  }

  const days = daysBetween(q.from, q.to);
  const plan: Array<{ date: string; sensor: SensorId; cl: Cluster; n: number }> = [];
  let total = 0;
  for (const date of days) {
    for (const sensor of q.sensors) {
      for (const cl of CLUSTERS) {
        const n = clusterCount(date, sensor, cl, q.bbox);
        if (n > 0) {
          plan.push({ date, sensor, cl, n });
          total += n;
        }
      }
    }
  }

  const scale = total > MOCK_ITEM_CAP ? MOCK_ITEM_CAP / total : 1;
  const items: FireDetection[] = [];
  for (const { date, sensor, cl, n } of plan) {
    const take = scale === 1 ? n : Math.round(n * scale);
    const rand = rng(hash(`pts|${date}|${sensor}|${cl.id}`));
    for (let i = 0; i < take; i++) {
      items.push(makeDetection(date, sensor, cl, q.bbox, rand, i));
    }
  }
  return { items, total, truncated: scale < 1, ...base };
}
