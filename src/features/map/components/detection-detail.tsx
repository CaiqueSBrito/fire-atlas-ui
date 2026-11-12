import { SENSOR_META } from "@/lib/sensors";
import type { DataOrigin, FireDetection } from "@/types/detections";

export const formatDateTime = (iso: string) =>
  `${new Date(iso).toLocaleString("pt-BR", {
    timeZone: "UTC",
    dateStyle: "short",
    timeStyle: "short",
  })} UTC`;

export const formatFrp = (frp: number | null) =>
  frp === null ? "Não informado" : `${frp.toLocaleString("pt-BR")} MW`;

export function DetectionDetail({
  detection: d,
  source,
  matchesAvailable,
  onClose,
}: {
  detection: FireDetection;
  source: DataOrigin;
  matchesAvailable: boolean;
  onClose: () => void;
}) {
  const meta = SENSOR_META[d.sensor];
  const rows: Array<[string, string]> = [
    ["Localização", `${d.lat.toFixed(4)}°, ${d.lon.toFixed(4)}°`],
    ["Data e hora", formatDateTime(d.datetime)],
    ["Sensor", `${meta.label}${d.platform ? ` · ${d.platform}` : ""}`],
    ["FRP (potência radiativa)", formatFrp(d.frp)],
  ];
  if (d.confidence) rows.push(["Confiança", d.confidence]);
  if (d.dayNight) rows.push(["Passagem", d.dayNight === "D" ? "Diurna" : "Noturna"]);
  if (matchesAvailable && d.matchId) {
    rows.push(["Correspondência", `Detecção ${d.matchId} (harmonização validada)`]);
  }
  rows.push(["Origem", `${source.name}${source.simulated ? " — simulado" : ""}`]);

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
          Detecção {meta.label}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-lg px-3 text-small text-ink-300 hover:text-ink-100"
        >
          Fechar
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
    </section>
  );
}
