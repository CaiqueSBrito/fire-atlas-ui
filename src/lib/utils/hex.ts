import { cellToBoundary, cellToLatLng, getHexagonEdgeLengthAvg, latLngToCell } from "h3-js";
import { HEX_RAMP } from "@/lib/map-layers";
import { MAX_H3_RESOLUTION } from "./h3-region";
import type { Detection } from "@/types/calendar";
import type { SensorId } from "@/types/detections";

export type HexCell = {
  id: string;
  res: number;
  count: number;
  modis: number;
  viirs: number;
  center: [number, number];
  edgeKm: number;
};

export type HexInfo = {
  res: number;
  edgeKm: number;
  max: number;
  cells: number;
  top: HexCell[];
};

const FOCUS_ZOOM_BY_RES: Record<number, number> = {
  1: 3.5,
  2: 4.5,
  3: 5.5,
  4: 7,
  5: 8.5,
};

export function hexFocusZoom(res: number): number {
  return FOCUS_ZOOM_BY_RES[res] ?? 8;
}

const ZOOM_TO_RES: ReadonlyArray<[number, number]> = [
  [2, 2],
  [3, 3],
  [4, 4],
];

export function hexResolution(zoom: number): number {
  for (const [limit, res] of ZOOM_TO_RES) if (zoom < limit) return res;
  return MAX_H3_RESOLUTION;
}

export function aggregateHex(
  points: Array<{ lat: number; lon: number; sensor: SensorId }>,
  res: number,
): HexCell[] {
  const cells = new Map<string, HexCell>();
  const edgeKm = getHexagonEdgeLengthAvg(res, "km");
  for (const p of points) {
    const id = latLngToCell(p.lat, p.lon, res);
    let cell = cells.get(id);
    if (!cell) {
      const [lat, lng] = cellToLatLng(id);
      cell = { id, res, count: 0, modis: 0, viirs: 0, center: [lng, lat], edgeKm };
      cells.set(id, cell);
    }
    cell.count++;
    cell[p.sensor]++;
  }
  return [...cells.values()];
}

export function gridPlotPoints(cells: HexCell[]): Detection[] {
  const out: Detection[] = [];
  for (const c of cells) {
    const base = { lat: c.center[1], lon: c.center[0], dayNight: null };
    if (c.modis > 0) out.push({ ...base, sensor: "MODIS" });
    if (c.viirs > 0) out.push({ ...base, sensor: "VIIRS" });
  }
  return out;
}

export function hexRing(id: string): Array<[number, number]> {
  const ring = cellToBoundary(id, true) as Array<[number, number]>;
  const lons = ring.map((p) => p[0]);
  const crossesAntimeridian = Math.max(...lons) - Math.min(...lons) > 180;
  return crossesAntimeridian
    ? ring.map(([lng, lat]) => [lng < 0 ? lng + 360 : lng, lat])
    : ring;
}

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

export function colorFloor(counts: number[], max: number): number {
  let smallest = Infinity;
  for (const c of counts) if (c > 0 && c < smallest) smallest = c;
  return smallest < 1 ? Math.max(max / 1000, smallest) : 1;
}

export function hexColor(count: number, max: number, floor = 1): string {
  const t = max <= floor ? 0 : Math.log(Math.max(floor, count) / floor) / Math.log(max / floor);
  const scaled = Math.min(1, Math.max(0, t)) * (HEX_RAMP.length - 1);
  const i = Math.min(HEX_RAMP.length - 2, Math.floor(scaled));
  const k = scaled - i;
  const a = hexToRgb(HEX_RAMP[i]);
  const b = hexToRgb(HEX_RAMP[i + 1]);
  const mix = a.map((v, n) => Math.round(v + (b[n] - v) * k));
  return `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function sameHexInfo(a: HexInfo | null, b: HexInfo | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.res === b.res &&
    a.edgeKm === b.edgeKm &&
    a.max === b.max &&
    a.cells === b.cells &&
    a.top.length === b.top.length &&
    a.top.every((c, i) => c.id === b.top[i].id && c.count === b.top[i].count)
  );
}

export function hexInfo(cells: HexCell[], res: number, topN = 8): HexInfo {
  const max = cells.reduce((m, c) => Math.max(m, c.count), 0);
  const top = [...cells].sort((a, b) => b.count - a.count).slice(0, topN);
  return { res, edgeKm: getHexagonEdgeLengthAvg(res, "km"), max, cells: cells.length, top };
}
