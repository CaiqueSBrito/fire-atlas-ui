import {
  cellToLatLng,
  getHexagonAreaAvg,
  getRes0Cells,
  latLngToCell,
  polygonToCells,
} from "h3-js";
import type { Bbox } from "@/types/detections";

export const MAX_H3_RESOLUTION = 5;
export const MAX_QUERY_CELLS = 380;

const TILE_DEGREES = 20;
const EARTH_RADIUS_KM = 6371;

export type RegionCells = { cells: string[]; resolution: number };

function bboxAreaKm2([w, s, e, n]: Bbox): number {
  const rad = Math.PI / 180;
  return (
    EARTH_RADIUS_KM ** 2 *
    Math.abs((e - w) * rad) *
    Math.abs(Math.sin(n * rad) - Math.sin(s * rad))
  );
}

function tiles([w, s, e, n]: Bbox): Bbox[] {
  const out: Bbox[] = [];
  for (let x = w; x < e; x += TILE_DEGREES) {
    for (let y = s; y < n; y += TILE_DEGREES) {
      out.push([x, y, Math.min(x + TILE_DEGREES, e), Math.min(y + TILE_DEGREES, n)]);
    }
  }
  return out;
}

function centerInside(id: string, [w, s, e, n]: Bbox): boolean {
  const [lat, lng] = cellToLatLng(id);
  return lng >= w && lng <= e && lat >= s && lat <= n;
}

function cellsAt(bbox: Bbox, resolution: number): string[] {
  if (resolution === 0) {
    return getRes0Cells().filter((id) => centerInside(id, bbox)).sort();
  }
  const found = new Set<string>();
  for (const [w, s, e, n] of tiles(bbox)) {
    const ring: Array<[number, number]> = [
      [s, w],
      [n, w],
      [n, e],
      [s, e],
    ];
    for (const id of polygonToCells(ring, resolution)) found.add(id);
  }
  return [...found].sort();
}

export function cellsForBbox(
  bbox: Bbox,
  resolutions: number[],
  maxCells = MAX_QUERY_CELLS,
): RegionCells {
  const available = [...new Set(resolutions)].filter((r) => r <= MAX_H3_RESOLUTION).sort((a, b) => b - a);
  const area = bboxAreaKm2(bbox);
  const centerLat = (bbox[1] + bbox[3]) / 2;
  const centerLng = (bbox[0] + bbox[2]) / 2;

  for (const resolution of available) {
    const estimate = area / getHexagonAreaAvg(resolution, "km2");
    if (estimate < 1) {
      return { cells: [latLngToCell(centerLat, centerLng, resolution)], resolution };
    }
    if (estimate > maxCells * 1.4) continue;
    const cells = cellsAt(bbox, resolution);
    if (cells.length > 0 && cells.length <= maxCells) return { cells, resolution };
  }

  const coarsest = available[available.length - 1] ?? 0;
  return { cells: [latLngToCell(centerLat, centerLng, coarsest)], resolution: coarsest };
}
