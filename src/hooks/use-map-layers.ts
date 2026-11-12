"use client";

import { useQueryStates } from "nuqs";
import { mapLayerParsers } from "@/lib/map-layers";

export function useMapLayers() {
  return useQueryStates(mapLayerParsers, { history: "replace" });
}
