import { Button } from "@/components/ui/button";
import { SENSOR_META } from "@/lib/sensors";
import type { DataOrigin, FireDetection } from "@/types/detections";

export const formatDateTime = (iso: string) =>
  `${new Date(iso).toLocaleString("en-US", {
    timeZone: "UTC",
    dateStyle: "short",
    timeStyle: "short",
  })} UTC`;

export const formatFrp = (frp: number | null) =>
  frp === null ? "Not reported" : `${frp.toLocaleString("en-US")} MW`;

export function DetectionDetail({
  detection: d,
  source,
  matchesAvailable,
  view3d,
  onToggle3d,
  onClose,
}: {
  detection: FireDetection;
  source: DataOrigin;
  matchesAvailable: boolean;
  view3d: boolean;
  onToggle3d: () => void;
  onClose: () => void;
}) {
  const meta = SENSOR_META[d.sensor];
  const rows: Array<[string, string]> = [
    ["Location", `${d.lat.toFixed(4)}°, ${d.lon.toFixed(4)}°`],
    ["Date and time", formatDateTime(d.datetime)],
    ["Sensor", `${meta.label}${d.platform ? ` · ${d.platform}` : ""}`],
    ["FRP (fire radiative power)", formatFrp(d.frp)],
  ];
  if (d.confidence) rows.push(["Confidence", d.confidence]);
  if (d.dayNight) rows.push(["Overpass", d.dayNight === "D" ? "Daytime" : "Nighttime"]);
  if (matchesAvailable && d.matchId) {
    rows.push(["Match", `Detection ${d.matchId} (validated harmonization)`]);
  }
  rows.push(["Source", `${source.name}${source.simulated ? " — simulated" : ""}`]);

  return (
    <section
      aria-labelledby="detail-title"
      className="rounded-2xl border border-ember-400/50 bg-space-800 p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 id="detail-title" className="font-display text-lg font-bold">
          <span aria-hidden style={{ color: meta.hex }}>
            {meta.symbol}{" "}
          </span>
          Detection {meta.label}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-lg px-3 text-small text-ink-300 hover:text-ink-100"
        >
          Close
        </button>
      </div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-small">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-300">{k}</dt>
            <dd className="font-mono text-ink-100">{v}</dd>
          </div>
        ))}
      </dl>
      <Button variant="secondary" className="mt-4 w-full" onClick={onToggle3d}>
        {view3d ? "Back to 2D" : "View in 3D"}
      </Button>
    </section>
  );
}
