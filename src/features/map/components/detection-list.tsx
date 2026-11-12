import { SENSOR_META } from "@/lib/sensors";
import { cn } from "@/lib/utils/cn";
import type { FireDetection } from "@/types/detections";
import { formatDateTime, formatFrp } from "./detection-detail";

const LIMIT = 15;

export function DetectionList({
  items,
  total,
  selectedId,
  onSelect,
}: {
  items: FireDetection[];
  total: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const top = [...items]
    .sort((a, b) => (b.frp ?? -1) - (a.frp ?? -1))
    .slice(0, LIMIT);
  if (!top.length) return null;

  return (
    <section aria-labelledby="list-title">
      <h2 id="list-title" className="text-caption uppercase tracking-wider text-ink-300">
        Detecções de maior FRP
      </h2>
      <p className="mt-1 text-caption text-ink-300">
        Alternativa ao mapa: selecione para ver os detalhes. Mostrando{" "}
        {top.length} de {total.toLocaleString("pt-BR")}.
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {top.map((d) => {
          const meta = SENSOR_META[d.sensor];
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onSelect(d.id)}
                aria-pressed={d.id === selectedId}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 text-left text-small",
                  d.id === selectedId
                    ? "border-ember-400 bg-space-800"
                    : "border-space-600 hover:bg-space-800",
                )}
              >
                <span aria-hidden style={{ color: meta.hex }}>
                  {meta.symbol}
                </span>
                <span className="font-semibold">{meta.label}</span>
                <span className="truncate text-ink-300">{formatDateTime(d.datetime)}</span>
                <span className="ml-auto font-mono">{formatFrp(d.frp)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
