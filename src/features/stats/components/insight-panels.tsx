import type { StatsResponse } from "@/types/stats";
import { Unavailable } from "./unavailable";

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function RankingPanel({ ranking }: { ranking: StatsResponse["ranking"] }) {
  return (
    <section aria-labelledby="ranking-title" className="rounded-2xl border border-space-600 bg-space-800 p-5">
      <h2 id="ranking-title" className="font-display text-lg font-bold">Ranking de localidades</h2>
      {ranking ? (
        <>
          <p className="mt-1 text-small text-ink-300">
            Critério: {ranking.criterion}. Regra: {ranking.rule}.
          </p>
          <ol className="mt-3 flex flex-col gap-1">
            {ranking.items.map((it, i) => (
              <li key={it.label} className="flex items-center gap-3 rounded-lg bg-space-900 px-3 py-2 text-small">
                <span className="w-6 font-mono text-ink-300">{i + 1}.</span>
                <span>{it.label}</span>
                <span className="ml-auto font-mono">{fmt(it.value)} {ranking.unit}</span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <div className="mt-3">
          <Unavailable>
            O indicador e a regra de ordenação ainda não foram aprovados.
          </Unavailable>
        </div>
      )}
    </section>
  );
}

export function CriticalPeriods({ data }: { data: StatsResponse["criticalPeriods"] }) {
  return (
    <section aria-labelledby="critical-title" className="rounded-2xl border border-space-600 bg-space-800 p-5">
      <h2 id="critical-title" className="font-display text-lg font-bold">Períodos críticos</h2>
      {data ? (
        <>
          <p className="mt-1 text-small text-ink-300">Critério: {data.criterion}.</p>
          <ul className="mt-3 flex flex-col gap-1">
            {data.items.map((it) => (
              <li key={`${it.label}-${it.from}`} className="flex items-center gap-3 rounded-lg bg-space-900 px-3 py-2 text-small">
                <span>{it.label}</span>
                <span className="font-mono text-ink-300">{it.from} → {it.to}</span>
                <span className="ml-auto font-mono">{fmt(it.value)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-3">
          <Unavailable>
            O critério científico para destacar períodos críticos ainda não foi aprovado.
          </Unavailable>
        </div>
      )}
    </section>
  );
}
