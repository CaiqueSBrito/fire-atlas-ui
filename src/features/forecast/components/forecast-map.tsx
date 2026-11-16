"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { FireMap } from "@/features/map/components/fire-map-loader";
import { useMapLayers } from "@/hooks/use-map-layers";
import { FORECAST_RAMP } from "@/lib/map-layers";
import { supportsWebGL } from "@/lib/utils/webgl";
import type { Bbox } from "@/types/detections";
import type { ForecastCell } from "@/types/forecast";
import { fmtCoords, fmtInt, fmtNum, fmtPct, place } from "../format";

const NO_DETECTIONS: never[] = [];
const noop = () => {};
const subscribe = () => () => {};

export function boundsOf(cells: ForecastCell[], fallback: Bbox): Bbox {
  if (cells.length === 0) return fallback;
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const c of cells) {
    w = Math.min(w, c.lon);
    e = Math.max(e, c.lon);
    s = Math.min(s, c.lat);
    n = Math.max(n, c.lat);
  }
  const pad = 0.5;
  return [
    Math.max(-180, w - pad),
    Math.max(-85, s - pad),
    Math.min(180, e + pad),
    Math.min(85, n + pad),
  ];
}

const around = (c: ForecastCell): Bbox => [c.lon - 0.35, c.lat - 0.25, c.lon + 0.35, c.lat + 0.25];

function CellDetail({ cell }: { cell: ForecastCell }) {
  const rows: Array<[string, string]> = [
    ["7-day probability", `${fmtPct(cell.probability)}%`],
    ["Coordinates", fmtCoords(cell)],
    ["Detections in the last 24 hours", fmtNum(cell.detections24h, 0)],
    ["Detections in the last 7 days", fmtNum(cell.detections7d, 0)],
    ["7-day mean FRP", cell.frpMean7d === null ? "—" : `${fmtNum(cell.frpMean7d)} MW`],
    ["Active fire", cell.active === null ? "—" : cell.active ? "Yes" : "No"],
  ];
  return (
    <section
      aria-labelledby="forecast-cell-title"
      className="rounded-2xl border border-[#ff5a4f]/60 bg-space-900 p-4"
    >
      <h3 id="forecast-cell-title" className="text-small font-semibold">
        {place(cell)}
      </h3>
      <p className="font-mono text-caption text-ink-300">{cell.id}</p>
      <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-small">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-300">{k}</dt>
            <dd className="text-right font-mono">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ForecastMap({
  cells,
  totalCells,
  truncated,
  regionBbox,
}: {
  cells: ForecastCell[];
  totalCells: number;
  truncated: boolean;
  regionBbox: Bbox;
}) {
  const [layers] = useMapLayers();
  const webgl = useSyncExternalStore(subscribe, supportsWebGL, () => null);
  const overview = useMemo(() => boundsOf(cells, regionBbox), [cells, regionBbox]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = cells.find((c) => c.id === selectedId) ?? null;
  const view = useMemo(() => (selected ? around(selected) : overview), [selected, overview]);

  return (
    <section
      aria-labelledby="forecast-map-title"
      className="rounded-2xl border border-space-600 bg-space-800 p-5"
    >
      <h2 id="forecast-map-title" className="font-display text-lg font-bold">
        Fire risk map
      </h2>
      <p className="mt-1 text-small text-ink-300">
        {truncated
          ? `The ${fmtInt(cells.length)} highest-probability cells out of ${fmtInt(totalCells)} in the region.`
          : `All ${fmtInt(cells.length)} cells with forecasts in the region.`}{" "}
        Each cell appears as a point when zoomed out and as an H3 hexagon when zoomed in.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-2">
          <div className="relative min-h-[28rem] overflow-hidden rounded-xl border border-space-600 lg:min-h-[34rem]">
            {webgl === false ? (
              <p className="absolute inset-0 grid place-items-center p-6 text-center text-small text-ink-300">
                This browser cannot display the map (WebGL unavailable). The adjacent list and table below
                provide the same data.
              </p>
            ) : webgl === null ? null : (
            <FireMap
              detections={NO_DETECTIONS}
              view={view}
              aoi={null}
              drawing={false}
              selectedId={null}
              onSelect={noop}
              showMatches={false}
              basemap={layers.base}
              forecastCells={cells}
              label={`7-day fire forecast map: ${fmtInt(cells.length)} cells colored by probability. The adjacent list and table below provide the same data as text.`}
            />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-caption text-ink-300">
            <span>7-day fire probability</span>
            <span className="flex items-center gap-2">
              <span className="font-mono">0%</span>
              <span
                aria-hidden="true"
                className="h-2.5 w-32 rounded-full border border-[#ff5a4f]/60"
                style={{ background: `linear-gradient(to right, ${FORECAST_RAMP.join(", ")})` }}
              />
              <span className="font-mono">100%</span>
            </span>
            <span>· dashed red outline = forecast, not an observed detection</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {selected ? (
            <>
              <CellDetail cell={selected} />
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="self-start text-small font-semibold text-ember-400 hover:underline"
              >
                View entire region
              </button>
            </>
          ) : (
            <p className="rounded-xl border border-space-600 bg-space-900 p-3 text-caption text-ink-300">
              Choose a cell in the list to zoom in and view details.
            </p>
          )}
          <h3 className="text-small font-semibold tracking-[-0.02em] text-ink-300">
            Top {fmtInt(cells.length)} probabilities
          </h3>
          <ol className="flex max-h-[34rem] flex-col gap-1 overflow-y-auto pr-1">
            {cells.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={c.id === selectedId}
                  onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-space-600 px-3 text-left text-small transition hover:border-[#ff5a4f] aria-pressed:border-[#ff5a4f] aria-pressed:bg-[#ff5a4f]/10"
                >
                  <span className="w-7 shrink-0 font-mono text-caption text-ink-300">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{place(c)}</span>
                  <span className="shrink-0 font-mono font-semibold text-[#ff5a4f]">
                    {fmtPct(c.probability)}%
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
