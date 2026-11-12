import type { StatsResponse } from "@/types/stats";
import { Unavailable } from "./unavailable";

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function HistoryComparison({ history }: { history: StatsResponse["history"] }) {
  return (
    <section aria-labelledby="history-title" className="rounded-2xl border border-space-600 bg-space-800 p-5">
      <h2 id="history-title" className="font-display text-lg font-bold">
        Comparação histórica
      </h2>
      {history ? <Body h={history} /> : (
        <div className="mt-3">
          <Unavailable>
            Não há referência histórica suficiente para este recorte, ou a
            metodologia ainda não foi fornecida.
          </Unavailable>
        </div>
      )}
    </section>
  );
}

function Body({ h }: { h: NonNullable<StatsResponse["history"]> }) {
  const max = Math.max(h.observed, h.reference, 1);
  const pct = h.reference > 0 ? (h.anomaly / h.reference) * 100 : null;
  const sign = h.anomaly > 0 ? "+" : h.anomaly < 0 ? "−" : "";
  const bars = [
    { label: "Observado", value: h.observed, className: "bg-ember-400" },
    { label: "Referência", value: h.reference, className: "bg-ink-300" },
  ];

  return (
    <div className="mt-3 flex flex-col gap-4">
      <p className="text-small text-ink-300">{h.metric} ({h.unit})</p>
      <div className="flex flex-col gap-2">
        {bars.map((b) => (
          <div key={b.label} className="grid grid-cols-[6rem_1fr_auto] items-center gap-3 text-small">
            <span>{b.label}</span>
            <span className="h-3 rounded-full bg-space-900">
              <span
                className={`block h-3 rounded-full ${b.className}`}
                style={{ width: `${(b.value / max) * 100}%` }}
              />
            </span>
            <span className="font-mono">{fmt(b.value)}</span>
          </div>
        ))}
      </div>
      <p className="font-mono text-h2 font-bold">
        <span className="mr-2 text-small font-normal text-ink-300">Anomalia</span>
        {sign}
        {fmt(Math.abs(h.anomaly))}
        {pct !== null && (
          <span className="ml-2 text-small font-normal text-ink-300">
            ({sign}{Math.abs(pct).toFixed(1).replace(".", ",")}%)
          </span>
        )}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-small">
        <dt className="text-ink-300">Período de referência</dt>
        <dd>{h.referencePeriod}</dd>
        <dt className="text-ink-300">Método</dt>
        <dd>{h.method}</dd>
        <dt className="text-ink-300">Definição</dt>
        <dd>{h.anomalyDefinition}</dd>
      </dl>
    </div>
  );
}
