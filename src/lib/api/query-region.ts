import type { Bbox } from "@/types/detections";
import { cellsForBbox } from "@/lib/utils/h3-region";
import { splitBbox } from "@/lib/utils/tiles";
import { hasApi } from "./client";
import { GOLD_RESOLUTIONS } from "./coverage";

/** O cache acompanha as células consultadas, não pequenas mudanças de pixels no viewport. */
export function regionQueryKey(bbox: Bbox, tiled = false) {
  if (!hasApi) return bbox;
  return (tiled ? splitBbox(bbox) : [bbox]).map((tile) =>
    cellsForBbox(tile, GOLD_RESOLUTIONS).cells.join(","),
  );
}
