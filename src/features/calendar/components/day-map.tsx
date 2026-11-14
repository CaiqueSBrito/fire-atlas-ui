"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Region } from "@/config/regions";
import { FireMap } from "@/features/map/components/fire-map-loader";
import { hasApi } from "@/lib/api/client";
import { bboxOfPoints } from "@/lib/utils/bbox";
import { gridPlotPoints } from "@/lib/utils/hex";
import { supportsWebGL } from "@/lib/utils/webgl";
import type { Detection } from "@/types/calendar";
import type { Bbox, DetectionGrid, FireDetection } from "@/types/detections";
import { DayLiveMap, type DayMapLayers } from "./day-live-map";
import { RegionPlot } from "./region-plot";

const subscribe = () => () => {};
const noop = () => {};

export function DayMap({
  region,
  detections,
  grid = null,
  date,
  title,
  viewBbox = null,
  layers,
}: {
  region: Region;
  detections: Detection[];
  grid?: DetectionGrid | null;
  date: string;
  title: string;
  viewBbox?: Bbox | null;
  layers?: DayMapLayers;
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

  const gridPoints = useMemo(() => (grid ? gridPlotPoints(grid.cells) : []), [grid]);

  const view = useMemo(
    () => viewBbox ?? bboxOfPoints(grid ? gridPoints : detections, region.bbox),
    [viewBbox, grid, gridPoints, detections, region.bbox],
  );

  if (webgl === null) return <div className="h-full w-full bg-space-950" />;
  if (!webgl) {
    return (
      <RegionPlot
        region={region}
        detections={grid ? gridPoints : detections}
        title={title}
      />
    );
  }

  if (hasApi) {
    return <DayLiveMap region={region} date={date} viewBbox={viewBbox} layers={layers} />;
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
        basemap={layers?.base ?? "streets"}
        plot={grid ? "hex" : (layers?.plot ?? "points")}
        hexCells={grid?.cells ?? null}
        hexRes={grid?.resolution}
        showPoints={grid ? false : (layers?.dots ?? true)}
        showHeat={layers?.heat ?? false}
        label={
          grid
            ? `Mapa com ${grid.cells.length} células H3 com focos em ${region.label}`
            : `Mapa com ${detections.length} detecções em ${region.label}`
        }
      />
    </div>
  );
}
