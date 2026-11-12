"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Region } from "@/config/regions";
import { FireMap } from "@/features/map/components/fire-map-loader";
import { bboxOfPoints } from "@/lib/utils/bbox";
import { supportsWebGL } from "@/lib/utils/webgl";
import type { Detection } from "@/types/calendar";
import type { FireDetection } from "@/types/detections";
import { RegionPlot } from "./region-plot";

const subscribe = () => () => {};
const noop = () => {};

export function DayMap({
  region,
  detections,
  date,
  title,
}: {
  region: Region;
  detections: Detection[];
  date: string;
  title: string;
}) {
  const webgl = useSyncExternalStore(subscribe, supportsWebGL, () => null);

  const points = useMemo<FireDetection[]>(
    () =>
      detections.map((d, i) => ({
        id: `${d.sensor}-${i}`,
        lat: d.lat,
        lon: d.lon,
        datetime: `${date}T00:00:00Z`,
        sensor: d.sensor === "VIIRS" ? "viirs" : "modis",
        frp: null,
        dayNight: d.dayNight,
      })),
    [detections, date],
  );

  const view = useMemo(
    () => bboxOfPoints(detections, region.bbox),
    [detections, region.bbox],
  );

  if (webgl === null) return <div className="h-full w-full bg-space-950" />;
  if (!webgl) {
    return <RegionPlot region={region} detections={detections} title={title} />;
  }

  return (
    <div className="relative h-full w-full">
      <FireMap
        detections={points}
        view={view}
        aoi={null}
        drawing={false}
        selectedId={null}
        onSelect={noop}
        showMatches={false}
        label={`Mapa com ${detections.length} detecções em ${region.label}`}
      />
    </div>
  );
}
