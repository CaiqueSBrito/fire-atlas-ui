"use client";

import { useSyncExternalStore } from "react";
import type { Region } from "@/config/regions";
import { supportsWebGL } from "@/lib/utils/webgl";
import type { Bbox } from "@/types/detections";
import { DayLiveMap, type DayMapLayers } from "./day-live-map";

const subscribe = () => () => {};

export function DayMap({
  region,
  date,
  viewBbox = null,
  layers,
}: {
  region: Region;
  date: string;
  viewBbox?: Bbox | null;
  layers?: DayMapLayers;
}) {
  const webgl = useSyncExternalStore(subscribe, supportsWebGL, () => null);
  if (webgl === null) return <div className="h-full w-full bg-space-950" />;
  return (
    <DayLiveMap region={region} date={date} viewBbox={viewBbox} layers={layers} schematic={!webgl} />
  );
}
