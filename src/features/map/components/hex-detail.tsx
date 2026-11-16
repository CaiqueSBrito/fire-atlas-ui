import { Button } from "@/components/ui/button";
import { SENSOR_META } from "@/lib/sensors";
import { cn } from "@/lib/utils/cn";
import type { HexCell } from "@/lib/utils/hex";

const fmtKm = (km: number) => `${km.toLocaleString("en-US", { maximumFractionDigits: 1 })} km`;

export function HexDetail({
  cell,
  shown,
  total,
  truncated,
  view3d,
  onToggle3d,
  onClose,
  period,
}: {
  cell: HexCell;
  period?: { from: string; to: string };
  shown: number;
  total: number;
  truncated: boolean;
  view3d: boolean;
  onToggle3d: () => void;
  onClose: () => void;
}) {
  const rows: Array<[string, string]> = [
    ...(period
      ? ([["Selected period", [period.from, period.to].map((date) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC" })).join(" to ")]] as Array<[string, string]>)
      : []),
    ["Fire detections in cell", cell.count.toLocaleString("en-US")],
    ["◆ MODIS", cell.modis.toLocaleString("en-US")],
    ["● VIIRS", cell.viirs.toLocaleString("en-US")],
    ["H3 resolution", `${cell.res} (edge ≈ ${fmtKm(cell.edgeKm)})`],
    ["Center", `${cell.center[1].toFixed(3)}°, ${cell.center[0].toFixed(3)}°`],
    ["Cell", cell.id],
  ];
  return (
    <section
      aria-labelledby="hex-title"
      className="rounded-2xl border border-ember-400/50 bg-space-800 p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 id="hex-title" className="font-display text-lg font-bold">
          H3 hexagon
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-lg px-3 text-small text-ink-300 hover:text-ink-100"
        >
          Close
        </button>
      </div>
      <dl className="mt-3 grid gap-3 text-small">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5">
            <dt className="text-caption text-ink-300">{k}</dt>
            <dd className="break-words font-mono text-ink-100">{v}</dd>
          </div>
        ))}
      </dl>
      <Button variant="secondary" className="mt-4 w-full" onClick={onToggle3d}>
        {view3d ? "Back to 2D" : "View in 3D"}
      </Button>
      {truncated && (
        <p className="mt-3 text-caption text-ink-300">
          Count based on the {shown.toLocaleString("en-US")} displayed points, out of{" "}
          {total.toLocaleString("en-US")} in the selected area.
        </p>
      )}
    </section>
  );
}

export function HexTopList({
  cells,
  selectedId,
  onSelect,
}: {
  cells: HexCell[];
  selectedId: string | null;
  onSelect: (cell: HexCell) => void;
}) {
  if (!cells.length) return null;
  return (
    <section aria-labelledby="hex-top-title">
      <h2 id="hex-top-title" className="text-small font-semibold tracking-[-0.02em] text-ink-300">
        Hexagons with the most fire detections
      </h2>
      <p className="mt-1 text-caption text-ink-300">
        Map alternative: select to view details.
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {cells.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c)}
              aria-pressed={c.id === selectedId}
              className={cn(
                "flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 text-left text-small",
                c.id === selectedId
                  ? "border-ember-400 bg-space-800"
                  : "border-space-600 hover:bg-space-800",
              )}
            >
              <span className="font-mono font-semibold">{c.count.toLocaleString("en-US")}</span>
              <span className="text-ink-300">fire detections</span>
              <span className="truncate text-ink-300">
                <span aria-hidden style={{ color: SENSOR_META.modis.hex }}>◆</span> {c.modis.toLocaleString("en-US")}{" "}
                <span aria-hidden style={{ color: SENSOR_META.viirs.hex }}>●</span> {c.viirs.toLocaleString("en-US")}
              </span>
              <span className="ml-auto font-mono text-caption text-ink-300">
                {c.center[1].toFixed(1)}°, {c.center[0].toFixed(1)}°
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
