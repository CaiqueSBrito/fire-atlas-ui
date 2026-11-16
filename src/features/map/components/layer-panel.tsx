"use client";

import { useId } from "react";
import { Toggle } from "@/components/ui/toggle";
import { PLOT_OPTIONS, type BasemapId, type PlotId } from "@/lib/map-layers";

const radio =
  "flex cursor-pointer items-start gap-3 rounded-xl border border-space-600 p-3 has-[:checked]:border-ember-400 has-[:checked]:bg-space-800 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus-ring)";

export function Group({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-t border-space-600 pt-1">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-small font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-4 w-4 text-ink-300 transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div role="group" aria-label={title} className="flex flex-col gap-2 pb-3">
        {children}
      </div>
    </details>
  );
}

export function LayerPanel({
  base,
  plot = "points",
  gridOnly = null,
  dots = true,
  heat,
  forecast,
  onChange,
}: {
  base: BasemapId;
  plot?: PlotId;
  gridOnly?: { resolution: number } | null;
  dots?: boolean;
  heat: boolean;
  forecast?: boolean;
  onChange: (next: {
    base?: BasemapId;
    plot?: PlotId;
    dots?: boolean;
    heat?: boolean;
    forecast?: boolean;
  }) => void;
}) {
  const plotName = useId();
  const illustrated = base === "illustrated";

  return (
    <section aria-labelledby="layers-title" className="flex flex-col">
      <h2 id="layers-title" className="mb-1 text-small font-semibold tracking-[-0.02em] text-ink-300">
        Map layers
      </h2>

      <Group title="Fire detection display">
        {gridOnly && (
          <p className="rounded-xl border border-space-600 p-3 text-caption text-ink-300">
            The data source aggregates fire detections by H3 cell (resolution {gridOnly.resolution}).
            Individual points are not available.
          </p>
        )}
        {!gridOnly && PLOT_OPTIONS.map((o) => (
          <label key={o.id} className={radio}>
            <input
              type="radio"
              name={plotName}
              value={o.id}
              checked={plot === o.id}
              onChange={() => onChange({ plot: o.id })}
              className="mt-1 accent-(--ember-400)"
            />
            <span className="flex flex-col">
              <span className="text-small font-semibold">{o.label}</span>
              <span className="text-caption text-ink-300">{o.description}</span>
            </span>
          </label>
        ))}
        {plot === "hex" && !gridOnly && (
          <Toggle
            checked={dots}
            onChange={(next) => onChange({ dots: next })}
            label="Show points over hexagons"
            description="When zoomed in, each detection ◆ ● appears above the cell; click to view details"
          />
        )}
      </Group>

      <Group title="Overlays">
        <Toggle
          checked={heat}
          onChange={(next) => onChange({ heat: next })}
          label="Heatmap"
          description="Fire detection density, weighted by FRP when available"
        />
        {forecast !== undefined && (
          <Toggle
            checked={forecast}
            onChange={(next) => onChange({ forecast: next })}
            label="Fire forecast (7 days)"
            description="Probability estimated by the data team's model, per hexagon; not an observed detection"
          />
        )}
      </Group>

      <Group title="Settings">
        <Toggle
          checked={illustrated}
          onChange={(next) => onChange({ base: next ? "illustrated" : "streets" })}
          label="Illustrated map"
          description="Countries and states in grayscale, replacing the basemap"
        />
      </Group>
    </section>
  );
}
