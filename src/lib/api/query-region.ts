import type { Bbox } from "@/types/detections";
import { cellsForBbox } from "@/lib/utils/h3-region";
import { splitBbox } from "@/lib/utils/tiles";

export function regionQueryKey(bbox: Bbox, resolutions: number[], tiled = false): string[] {
  return (tiled ? splitBbox(bbox) : [bbox]).map((tile) =>
    cellsForBbox(tile, resolutions).cells.join(","),
  );
}
