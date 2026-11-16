import { daysInMonth, todayUtc } from "@/lib/utils/dates";
import type {
  ActivityDay,
  ActivityMonth,
  DaySatellites,
  MonthAnomaly,
  TemperatureBin,
} from "@/types/calendar";
import { UNIT_LABEL_FALLBACK } from "./activity";

const SOURCE = { name: "Simulated data (prototype)", simulated: true };

const TEMPERATURE_EDGES: readonly [string, number | null, number | null][] = [
  ["lt320", null, 320],
  ["320", 320, 330],
  ["330", 330, 340],
  ["340", 340, 350],
  ["350", 350, 360],
  ["ge360", 360, null],
  ["none", null, null],
];

const SHARES = [0.06, 0.18, 0.3, 0.24, 0.12, 0.07, 0.03];
const REGION_WEIGHT: Record<string, number> = { world: 12, brasil: 4 };

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

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const t = setTimeout(resolve, ms);
  signal?.addEventListener("abort", () => {
    clearTimeout(t);
    reject(signal.reason);
  });
  return promise;
}

export function simulateActivityDay(date: string, region: string): ActivityDay {
  const rand = rng(`${date}|${region}|harmonized`);
  const roll = rand();
  if (date > todayUtc() || roll < 0.1) {
    return { date, status: "unavailable", value: null, contributing: 0, basis: null, temperature: null };
  }
  if (roll < 0.18) {
    return { date, status: "none", value: 0, contributing: 2, basis: "viirs", temperature: null };
  }
  const value = Math.round((40 + rand() * 160) * (REGION_WEIGHT[region] ?? 1) * 10) / 10;
  const weights = SHARES.map((s) => s * (0.6 + rand() * 0.8));
  const total = weights.reduce((a, b) => a + b, 0);
  const temperature: TemperatureBin[] = TEMPERATURE_EDGES.map(([key, fromK, toK], i) => ({
    key,
    fromK,
    toK,
    value: (value * weights[i]) / total,
  }));
  return { date, status: "activity", value, contributing: 2, basis: "viirs", temperature };
}

export async function mockActivityMonth(
  month: string,
  region: string,
  signal?: AbortSignal,
): Promise<ActivityMonth> {
  await delay(250, signal);
  const days = Array.from({ length: daysInMonth(month) }, (_, i) =>
    simulateActivityDay(`${month}-${String(i + 1).padStart(2, "0")}`, region),
  );
  return {
    month,
    region,
    days,
    unitLabel: UNIT_LABEL_FALLBACK,
    warnings: ["Simulated data: none of the numbers on this screen come from FIRMS."],
    source: SOURCE,
  };
}

export async function mockMonthAnomaly(month: string, signal?: AbortSignal): Promise<MonthAnomaly> {
  await delay(150, signal);
  return {
    sufficient: false,
    current: null,
    baselineMedian: null,
    deviationPct: null,
    yearsWithData: 0,
    minYears: 3,
    note: `Simulated data has no history for ${month}.`,
  };
}

export async function mockDaySatellites(date: string, signal?: AbortSignal): Promise<DaySatellites> {
  await delay(150, signal);
  if (date > todayUtc()) return { date, contributing: [], available: [] };
  return { date, contributing: ["NOAA-20", "NOAA-21"], available: ["Aqua", "NOAA-20", "NOAA-21", "Terra"] };
}
