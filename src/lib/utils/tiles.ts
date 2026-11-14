import type { Bbox } from "@/types/detections";

export const TILE_SPAN_DEGREES = 40;
export const MAX_TILES = 12;

export function splitBbox(
  [w, s, e, n]: Bbox,
  maxSpan = TILE_SPAN_DEGREES,
  maxTiles = MAX_TILES,
): Bbox[] {
  let span = maxSpan;
  let cols = Math.max(1, Math.ceil((e - w) / span));
  let rows = Math.max(1, Math.ceil((n - s) / span));
  while (cols * rows > maxTiles) {
    span *= 1.25;
    cols = Math.max(1, Math.ceil((e - w) / span));
    rows = Math.max(1, Math.ceil((n - s) / span));
  }
  const dw = (e - w) / cols;
  const dh = (n - s) / rows;
  const tiles: Bbox[] = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      tiles.push([w + i * dw, s + j * dh, i === cols - 1 ? e : w + (i + 1) * dw, j === rows - 1 ? n : s + (j + 1) * dh]);
    }
  }
  return tiles;
}
