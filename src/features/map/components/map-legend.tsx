import { FORECAST_RAMP, HEAT_RAMP, HEX_RAMP, NDVI_RAMP, type BasemapId, type PlotId } from "@/lib/map-layers";
import type { HexInfo } from "@/lib/utils/hex";
import { SENSOR_META, SENSORS } from "@/lib/sensors";
import type { SensorId } from "@/types/detections";

const ramp = (colors: string[]) => `linear-gradient(to right, ${colors.join(", ")})`;

function Gradient({
  title,
  colors,
  low,
  mid,
  high,
  note,
}: {
  title: string;
  colors: string[];
  low: string;
  mid?: string;
  high: string;
  note?: string;
}) {
  return (
    <li className="flex flex-col gap-1">
      <span>{title}</span>
      <span aria-hidden className="h-2.5 rounded-full" style={{ background: ramp(colors) }} />
      <span className="flex justify-between text-caption text-ink-300">
        <span>{low}</span>
        {mid && <span>{mid}</span>}
        <span>{high}</span>
      </span>
      {note && <span className="text-caption text-ink-300">{note}</span>}
    </li>
  );
}

export function MapLegend({
  counts,
  enabled,
  showMatches = false,
  basemap = "satellite",
  showHeat = false,
  plot = "points",
  hexInfo,
  harmonizedUnit,
  forecastIssue,
}: {
  counts?: Partial<Record<SensorId, number>>;
  enabled?: SensorId[];
  showMatches?: boolean;
  basemap?: BasemapId;
  showHeat?: boolean;
  plot?: PlotId;
  hexInfo?: HexInfo | null;
  harmonizedUnit?: string;
  forecastIssue?: string | null;
}) {
  return (
    <section aria-labelledby="legend-title">
      <h2
        id="legend-title"
        className="text-small font-semibold tracking-[-0.02em] text-ink-300"
      >
        Legend
      </h2>
      <ul className="mt-2 flex flex-col gap-1.5 text-small">
        {SENSORS.map((s) => {
          const on = !enabled || enabled.includes(s);
          return (
            <li key={s} className="flex items-center gap-2">
              <span
                aria-hidden
                style={{ color: SENSOR_META[s].hex }}
                className={on ? "" : "opacity-30"}
              >
                {SENSOR_META[s].symbol}
              </span>
              <span className={on ? "" : "text-ink-300"}>
                {SENSOR_META[s].label}
                <span className="text-ink-300"> · {SENSOR_META[s].platforms}</span>
                {!on && <span className="text-ink-300"> (hidden)</span>}
              </span>
              {on && counts?.[s] !== undefined && (
                <span className="ml-auto font-mono text-ink-300">
                  {counts[s]!.toLocaleString("en-US")}
                </span>
              )}
            </li>
          );
        })}
        {showMatches && (
          <li className="flex items-center gap-2">
            <span aria-hidden className="grid h-4 w-4 place-items-center rounded-full border-2 border-white" />
            Cross-sensor match (validated harmonization)
          </li>
        )}
        {plot === "hex" && hexInfo && (
          <Gradient
            title={
              harmonizedUnit
                ? `Harmonized activity per hexagon (H3, resolution ${hexInfo.res})`
                : `Fire detections per hexagon (H3, resolution ${hexInfo.res})`
            }
            colors={HEX_RAMP}
            low={harmonizedUnit ? "Lower" : "1 detection"}
            high={
              harmonizedUnit
                ? hexInfo.max.toLocaleString("en-US", { maximumFractionDigits: 1 })
                : `${hexInfo.max.toLocaleString("en-US")} detections`
            }
            note={`${harmonizedUnit ? `${harmonizedUnit} · ` : ""}Edge ≈ ${hexInfo.edgeKm.toLocaleString("en-US", { maximumFractionDigits: 1 })} km · ${hexInfo.cells.toLocaleString("en-US")} cells · logarithmic scale`}
          />
        )}
        {forecastIssue && (
          <Gradient
            title="Forecast: probability of fire in the next 7 days"
            colors={FORECAST_RAMP}
            low="0%"
            mid="50%"
            high="100%"
            note={`Dashed red hexagons (points when zoomed out). Issued ${new Date(`${forecastIssue}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC" })}. Model estimate, not an observed detection.`}
          />
        )}
        {showHeat && (
          <Gradient
            title="Heatmap (fire detection density)"
            colors={HEAT_RAMP}
            low="Lower density"
            high="Higher density"
          />
        )}
        {basemap === "vegetation" && (
          <Gradient
            title="Vegetation (NDVI, MODIS)"
            colors={NDVI_RAMP.colors}
            low={NDVI_RAMP.low}
            mid={NDVI_RAMP.mid}
            high={NDVI_RAMP.high}
          />
        )}
        {basemap === "streets" && (
          <li className="text-caption text-ink-300">
            Street map: © OpenStreetMap contributors · OpenFreeMap (OpenMapTiles).
          </li>
        )}
        {basemap === "illustrated" && (
          <li className="text-caption text-ink-300">
            Grayscale shades are decorative only and do not represent data.
            Internal boundaries are available only for the largest countries.
          </li>
        )}
      </ul>
    </section>
  );
}
