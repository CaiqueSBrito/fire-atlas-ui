import type { Bbox } from "@/types/detections";

const PAD_RATIO = 0.25;
const KEEP_RATIO = 0.4;
const WORLD: Bbox = [-180, -90, 180, 90];
const TILE_SIZE = 512;
const MAX_LAT = 85;

export function flatViewport(
  center: [number, number],
  zoom: number,
  width: number,
  height: number,
  widen = 1,
): Bbox {
  const world = TILE_SIZE * 2 ** zoom;
  const [lng, rawLat] = center;
  const lat = Math.max(-MAX_LAT, Math.min(MAX_LAT, rawLat));
  const dLng = ((width * widen) / world) * 360;
  const yOf = (value: number) =>
    ((1 - Math.log(Math.tan(Math.PI / 4 + (value * Math.PI) / 360)) / Math.PI) / 2) * world;
  const latAt = (y: number) =>
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / world))) * 180) / Math.PI;
  const half = (height * widen) / 2;
  const y = yOf(lat);
  return [
    Math.max(-180, lng - dLng / 2),
    Math.max(-MAX_LAT, latAt(y + half)),
    Math.min(180, lng + dLng / 2),
    Math.min(MAX_LAT, latAt(y - half)),
  ];
}

export function spanOf([w, s, e, n]: Bbox): number {
  return Math.max(e - w, n - s);
}

export function containsBbox(outer: Bbox, inner: Bbox): boolean {
  return (
    inner[0] >= outer[0] &&
    inner[1] >= outer[1] &&
    inner[2] <= outer[2] &&
    inner[3] <= outer[3]
  );
}

function isUsable([w, s, e, n]: Bbox): boolean {
  return [w, s, e, n].every(Number.isFinite) && e > w && n > s;
}

export function padViewport(viewport: Bbox, ratio = PAD_RATIO): Bbox {
  if (!isUsable(viewport)) return WORLD;
  const [w, s, e, n] = viewport;
  const dx = (e - w) * ratio;
  const dy = (n - s) * ratio;
  const round = (value: number) => Number(value.toFixed(1));
  return [
    round(Math.max(-180, w - dx)),
    round(Math.max(-90, s - dy)),
    round(Math.min(180, e + dx)),
    round(Math.min(90, n + dy)),
  ];
}

export function nextQueryArea(current: Bbox | null, viewport: Bbox): Bbox {
  if (!isUsable(viewport)) return WORLD;
  if (
    current &&
    containsBbox(current, viewport) &&
    spanOf(viewport) >= spanOf(current) * KEEP_RATIO
  ) {
    return current;
  }
  return padViewport(viewport);
}
