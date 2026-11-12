import { TEMPERATURE_STOPS } from "@/lib/map-layers";
import type { Bbox } from "@/types/detections";

export type TemperatureGrid = {
  lons: number[];
  lats: number[];
  values: Array<Array<number | null>>;
  date: string;
  min: number;
  max: number;
};

export type GridAxes = { lons: number[]; lats: number[]; step: number };

const STEPS = [0.5, 1, 2, 2.5, 4, 5, 8, 10, 12, 15, 20, 30];
const MAX_LAT = 85;

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const STOPS = TEMPERATURE_STOPS.map((s) => ({ t: s.t, rgb: hexToRgb(s.hex) }));

export function temperatureColor(t: number): [number, number, number] {
  if (t <= STOPS[0].t) return STOPS[0].rgb;
  const last = STOPS[STOPS.length - 1];
  if (t >= last.t) return last.rgb;
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (t >= a.t && t <= b.t) {
      const k = (t - a.t) / (b.t - a.t);
      return [
        Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * k),
        Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * k),
        Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * k),
      ];
    }
  }
  return last.rgb;
}

export const mercatorY = (lat: number) => {
  const phi = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + phi / 2));
};

export const inverseMercatorY = (y: number) =>
  ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;

function axis(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  const count = Math.round((to - from) / step);
  for (let i = 0; i <= count; i++) out.push(Number((from + i * step).toFixed(4)));
  return out;
}

export function gridAxes(bbox: Bbox, maxPoints = 400, minStep = 0.5): GridAxes {
  const west = Math.max(-180, bbox[0]);
  const east = Math.min(180, bbox[2]);
  const south = Math.max(-MAX_LAT, bbox[1]);
  const north = Math.min(MAX_LAT, bbox[3]);

  const candidates = STEPS.filter((s) => s >= minStep);
  for (const step of candidates) {
    const w = Math.max(-180, Math.floor(west / step) * step);
    const e = Math.min(180, Math.ceil(east / step) * step);
    const s = Math.max(-MAX_LAT, Math.floor(south / step) * step);
    const n = Math.min(MAX_LAT, Math.ceil(north / step) * step);
    const lons = axis(w, e, step);
    const lats = axis(s, n, step).reverse();
    if (lons.length * lats.length <= maxPoints) return { lons, lats, step };
  }
  const step = candidates[candidates.length - 1];
  return {
    lons: axis(Math.floor(west / step) * step, Math.ceil(east / step) * step, step),
    lats: axis(Math.floor(south / step) * step, Math.ceil(north / step) * step, step).reverse(),
    step,
  };
}

export function gridPoints(axes: GridAxes): Array<{ lat: number; lon: number }> {
  return axes.lats.flatMap((lat) => axes.lons.map((lon) => ({ lat, lon })));
}

export function fillGaps(values: Array<Array<number | null>>): number[][] {
  const rows = values.length;
  const cols = values[0]?.length ?? 0;
  let work = values.map((r) => [...r]);
  for (let pass = 0; pass < 6; pass++) {
    let missing = 0;
    const next = work.map((r) => [...r]);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (work[y][x] !== null) continue;
        let sum = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const v = work[y + dy]?.[x + dx];
            if (typeof v === "number") {
              sum += v;
              n++;
            }
          }
        }
        if (n) next[y][x] = sum / n;
        else missing++;
      }
    }
    work = next;
    if (!missing) break;
  }
  const flat = work.flat().filter((v): v is number => typeof v === "number");
  const mean = flat.length ? flat.reduce((a, b) => a + b, 0) / flat.length : 0;
  return work.map((r) => r.map((v) => v ?? mean));
}

function cubic(p0: number, p1: number, p2: number, p3: number, t: number) {
  return (
    p1 +
    0.5 *
      t *
      (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)))
  );
}

function locate(values: number[], v: number, descending: boolean): [number, number] {
  const n = values.length;
  if (n === 1) return [0, 0];
  for (let i = 0; i < n - 1; i++) {
    const a = values[i];
    const b = values[i + 1];
    const inside = descending ? v <= a && v >= b : v >= a && v <= b;
    if (inside) return [i, (v - a) / (b - a || 1)];
  }
  return descending
    ? v > values[0] ? [0, 0] : [n - 2, 1]
    : v < values[0] ? [0, 0] : [n - 2, 1];
}

export function sampleField(
  grid: number[][],
  lons: number[],
  lats: number[],
  lon: number,
  lat: number,
): number {
  const [i, tx] = locate(lons, lon, false);
  const [j, ty] = locate(lats, lat, true);
  const cols = lons.length;
  const rows = lats.length;
  const at = (y: number, x: number) =>
    grid[Math.min(rows - 1, Math.max(0, y))][Math.min(cols - 1, Math.max(0, x))];
  const row = (y: number) =>
    cubic(at(y, i - 1), at(y, i), at(y, i + 1), at(y, i + 2), tx);
  return cubic(row(j - 1), row(j), row(j + 1), row(j + 2), ty);
}

export function fieldBounds(grid: Pick<TemperatureGrid, "lons" | "lats">): Bbox {
  return [
    grid.lons[0],
    grid.lats[grid.lats.length - 1],
    grid.lons[grid.lons.length - 1],
    grid.lats[0],
  ];
}

export function fieldSize(bounds: Bbox, maxDim = 1024): { width: number; height: number } {
  const [w, s, e, n] = bounds;
  const spanX = ((e - w) * Math.PI) / 180;
  const spanY = mercatorY(n) - mercatorY(s);
  if (spanX >= spanY) {
    return { width: maxDim, height: Math.max(2, Math.round((maxDim * spanY) / spanX)) };
  }
  return { width: Math.max(2, Math.round((maxDim * spanX) / spanY)), height: maxDim };
}

export function projector(bounds: Bbox, width: number, height: number) {
  const [w, s, e, n] = bounds;
  const yTop = mercatorY(n);
  const ySpan = yTop - mercatorY(s);
  return {
    x: (lon: number) => ((lon - w) / (e - w)) * width,
    y: (lat: number) => ((yTop - mercatorY(lat)) / ySpan) * height,
  };
}

export function renderField(
  grid: TemperatureGrid,
  width: number,
  height: number,
  alpha = 235,
): Uint8ClampedArray<ArrayBuffer> {
  const filled = fillGaps(grid.values);
  const [w, s, e, n] = fieldBounds(grid);
  const yTop = mercatorY(n);
  const ySpan = yTop - mercatorY(s);
  const out = new Uint8ClampedArray(width * height * 4);
  for (let py = 0; py < height; py++) {
    const lat = inverseMercatorY(yTop - ((py + 0.5) / height) * ySpan);
    for (let px = 0; px < width; px++) {
      const lon = w + ((px + 0.5) / width) * (e - w);
      const t = sampleField(filled, grid.lons, grid.lats, lon, lat);
      const [r, g, b] = temperatureColor(t);
      const o = (py * width + px) * 4;
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = alpha;
    }
  }
  return out;
}
