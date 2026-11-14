import { cellToLatLng, cellsToMultiPolygon, gridDisk } from "h3-js";
import type { HexCell } from "@/lib/utils/hex";

export const AREA_SHARES = [0, 25, 10, 5] as const;

export type HotArea = {
  id: string;
  cells: string[];
  res: number;
  count: number;
  modis: number;
  viirs: number;
  center: [number, number];
  polygon: Array<Array<Array<[number, number]>>>;
};

export type HotAreas = {
  share: number;
  threshold: number;
  cells: number;
  areas: HotArea[];
};

export function thresholdFor(counts: number[], share: number): number {
  if (counts.length === 0) return Infinity;
  const sorted = [...counts].sort((a, b) => a - b);
  const index = Math.floor((1 - share / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, index))];
}

export function computeHotAreas(cells: HexCell[], share: number): HotAreas | null {
  if (share <= 0 || cells.length === 0) return null;
  const threshold = thresholdFor(
    cells.map((c) => c.count),
    share,
  );
  const hot = new Map<string, HexCell>();
  for (const c of cells) if (c.count >= threshold) hot.set(c.id, c);

  const visited = new Set<string>();
  const areas: HotArea[] = [];
  for (const start of hot.keys()) {
    if (visited.has(start)) continue;
    const members: HexCell[] = [];
    const queue = [start];
    visited.add(start);
    while (queue.length) {
      const id = queue.pop()!;
      members.push(hot.get(id)!);
      for (const next of gridDisk(id, 1)) {
        if (hot.has(next) && !visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    const ids = members.map((m) => m.id);
    const count = members.reduce((acc, m) => acc + m.count, 0);
    let lat = 0;
    let lng = 0;
    for (const id of ids) {
      const [la, lo] = cellToLatLng(id);
      lat += la;
      lng += lo;
    }
    areas.push({
      id: ids.slice().sort()[0],
      cells: ids,
      res: members[0].res,
      count,
      modis: members.reduce((acc, m) => acc + m.modis, 0),
      viirs: members.reduce((acc, m) => acc + m.viirs, 0),
      center: [lng / ids.length, lat / ids.length],
      polygon: cellsToMultiPolygon(ids, true) as HotArea["polygon"],
    });
  }
  areas.sort((a, b) => b.count - a.count);
  return { share, threshold, cells: hot.size, areas };
}
