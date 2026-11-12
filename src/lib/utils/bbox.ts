import type { Bbox } from "@/types/detections";

export const WORLD_BBOX: Bbox = [-180, -90, 180, 90];

export function parseBbox(value: string | null | undefined): Bbox | null {
  if (!value) return null;
  const parts = value.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return parts as Bbox;
}

export function formatBboxParam(b: Bbox): string {
  return b.map((n) => Number(n.toFixed(4))).join(",");
}

export function validateBbox(b: Bbox): string | null {
  const [w, s, e, n] = b;
  if (s < -90 || n > 90) return "A latitude deve estar entre −90° e 90°.";
  if (w < -180 || e > 180) return "A longitude deve estar entre −180° e 180°.";
  if (s >= n) return "O limite sul deve ser menor que o norte.";
  if (w >= e) return "O limite oeste deve ser menor que o leste.";
  return null;
}

export function bboxContains(b: Bbox, lon: number, lat: number): boolean {
  return lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3];
}

export function bboxOfPoints(
  points: Array<{ lat: number; lon: number }>,
  fallback: Bbox,
  padRatio = 0.2,
  minSpan = 4,
): Bbox {
  if (!points.length) return fallback;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const p of points) {
    west = Math.min(west, p.lon);
    east = Math.max(east, p.lon);
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
  }
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const centerX = (west + east) / 2;
  const centerY = (south + north) / 2;
  const halfX = (Math.max(east - west, minSpan) * (1 + padRatio * 2)) / 2;
  const halfY = (Math.max(north - south, minSpan) * (1 + padRatio * 2)) / 2;
  return [
    clamp(centerX - halfX, -180, 180),
    clamp(centerY - halfY, -90, 90),
    clamp(centerX + halfX, -180, 180),
    clamp(centerY + halfY, -90, 90),
  ];
}

export function padBbox(b: Bbox, ratio: number): Bbox {
  const dx = (b[2] - b[0]) * ratio;
  const dy = (b[3] - b[1]) * ratio;
  return [
    Math.max(-180, b[0] - dx),
    Math.max(-85, b[1] - dy),
    Math.min(180, b[2] + dx),
    Math.min(85, b[3] + dy),
  ];
}
