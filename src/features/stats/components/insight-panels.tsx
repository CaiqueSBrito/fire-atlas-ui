import type { StatsResponse } from "@/types/stats";
import { Unavailable } from "./unavailable";

const fmt = (n: number) => n.toLocaleString("en-US");

export function RankingPanel({
  ranking,
  selectedCell = null,
  onSelectCell,
}: {
  ranking: StatsResponse["ranking"];
  selectedCell?: string | null;
  onSelectCell?: (h3: string) => void;
}) {
  return (
    <section aria-labelledby="ranking-title" className="rounded-2xl border border-space-600 bg-space-800 p-5">
      <h2 id="ranking-title" className="font-display text-lg font-bold">Location ranking</h2>
      {ranking ? (
        <>
          <p className="mt-1 text-small text-ink-300">
            Criterion: {ranking.criterion}. Rule: {ranking.rule}.
            {onSelectCell && " Choose a cell to view its historical comparison."}
          </p>
          <ol className="mt-3 flex flex-col gap-1">
            {ranking.items.map((item, i) => {
              const content = (
                <>
                  <span className="w-6 font-mono text-ink-300">{i + 1}.</span>
                  <span className="text-left">{item.label}</span>
                  <span className="ml-auto shrink-0 font-mono">{fmt(item.value)} {ranking.unit}</span>
                </>
              );
              const cell = item.h3;
              return (
                <li key={item.label}>
                  {onSelectCell && cell ? (
                    <button
                      type="button"
                      aria-pressed={cell === selectedCell}
                      onClick={() => onSelectCell(cell)}
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-transparent bg-space-900 px-3 py-2 text-small transition hover:border-ember-400/60 aria-pressed:border-ember-400 aria-pressed:bg-ember-400/10"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg bg-space-900 px-3 py-2 text-small">{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <div className="mt-3">
          <Unavailable>
            The indicator and ranking rule have not yet been approved.
          </Unavailable>
        </div>
      )}
    </section>
  );
}

export function CriticalPeriods({ data }: { data: StatsResponse["criticalPeriods"] }) {
  return (
    <section aria-labelledby="critical-title" className="rounded-2xl border border-space-600 bg-space-800 p-5">
      <h2 id="critical-title" className="font-display text-lg font-bold">Critical periods</h2>
      {data ? (
        <>
          <p className="mt-1 text-small text-ink-300">Criterion: {data.criterion}.</p>
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
            The scientific criterion for highlighting critical periods has not yet been approved.
          </Unavailable>
        </div>
      )}
    </section>
  );
}
