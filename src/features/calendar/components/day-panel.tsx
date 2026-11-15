import { formatLong } from "@/lib/utils/dates";
import type { ActivityDay, DaySatellites } from "@/types/calendar";
import { BASIS_LABEL, binColor, binLabel, formatActivity, stackOrder } from "../temperature";

const STATUS: Record<ActivityDay["status"], { glyph: string; label: string }> = {
  activity: { glyph: "●", label: "Atividade registrada" },
  none: { glyph: "○", label: "Nenhuma atividade registrada" },
  unavailable: { glyph: "×", label: "Sem dado" },
};

const navButton =
  "inline-flex h-11 flex-1 items-center justify-center rounded-full border border-space-600 text-small font-semibold transition-colors hover:border-ember-400 hover:text-ember-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-space-600 disabled:hover:text-ink-100";

export function DayPanel({
  day,
  unitLabel,
  satellites,
  canGoNext,
  onPrev,
  onNext,
}: {
  day: ActivityDay | null;
  unitLabel: string;
  satellites: DaySatellites | null;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (!day) {
    return (
      <article className="rounded-2xl border border-space-600 bg-space-800 p-6">
        <p className="font-mono text-caption uppercase tracking-[0.2em] text-ember-400">Dia selecionado</p>
        <p className="mt-2 text-ink-300">Escolha um dia nas barras para ver os detalhes.</p>
      </article>
    );
  }

  const status = STATUS[day.status];
  const bins = day.temperature ? stackOrder(day.temperature).reverse() : null;
  const total = day.value ?? 0;

  return (
    <article aria-labelledby="day-panel-title" className="rounded-2xl border border-space-600 bg-space-800 p-6">
      <p className="font-mono text-caption uppercase tracking-[0.2em] text-ember-400">Dia selecionado</p>
      <h2
        id="day-panel-title"
        aria-live="polite"
        className="mt-1 font-display text-h2 font-bold leading-tight tracking-tight"
      >
        {formatLong(day.date)}
      </h2>
      <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-space-600 bg-space-950/60 px-3 py-1 text-small">
        <span aria-hidden="true" className="font-mono text-ember-400">
          {status.glyph}
        </span>
        {status.label}
      </p>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onPrev} className={navButton}>
          ‹ Anterior
        </button>
        <button type="button" onClick={onNext} disabled={!canGoNext} className={navButton}>
          Próximo ›
        </button>
      </div>

      {day.status === "unavailable" ? (
        <p className="mt-6 rounded-xl border border-dashed border-space-600 bg-space-900 px-4 py-3 text-small text-ink-300">
          Nenhum satélite contribuiu com dado para este dia. Isso não significa ausência de fogo.
        </p>
      ) : (
        <>
          <div className="mt-6 rounded-xl border border-space-600 bg-space-900 px-4 py-3">
            <p className="text-small text-ink-300">Atividade harmonizada</p>
            <p className="font-mono text-3xl font-bold">{formatActivity(total)}</p>
            <p className="mt-1 text-caption text-ink-300">{unitLabel}. Não é número de focos.</p>
          </div>

          <dl className="mt-3 grid gap-2 text-small">
            <div className="flex justify-between gap-3 rounded-xl border border-space-600 bg-space-900 px-4 py-2.5">
              <dt className="text-ink-300">Satélites que contribuíram</dt>
              <dd className="flex flex-wrap justify-end gap-x-2 text-right font-mono">
                {satellites?.contributing.length
                  ? satellites.contributing.map((name, i) => (
                      <span key={name} className="whitespace-nowrap">
                        {name}
                        {i < satellites.contributing.length - 1 ? "," : ""}
                      </span>
                    ))
                  : day.contributing}
              </dd>
            </div>
            {day.basis && (
              <div className="flex justify-between gap-3 rounded-xl border border-space-600 bg-space-900 px-4 py-2.5">
                <dt className="text-ink-300">Temperatura medida por</dt>
                <dd className="whitespace-nowrap text-right font-mono">{BASIS_LABEL[day.basis]}</dd>
              </div>
            )}
          </dl>

          <section aria-labelledby="day-temp-title" className="mt-5">
            <h3 id="day-temp-title" className="font-display text-base font-bold">
              Por temperatura de brilho
            </h3>
            {bins && total > 0 ? (
              <>
                <div aria-hidden="true" className="mt-2 flex h-2.5 gap-px overflow-hidden rounded-full bg-space-900">
                  {bins
                    .filter((b) => b.value > 0)
                    .map((b) => (
                      <span key={b.key} style={{ flexGrow: b.value, flexBasis: 0, background: binColor(b.key) }} />
                    ))}
                </div>
                <ul className="mt-3 grid gap-1.5 text-small">
                  {bins.map((b) => (
                    <li key={b.key} className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="inline-block h-3 w-3 shrink-0 rounded-[3px]"
                        style={{ background: binColor(b.key) }}
                      />
                      <span className="flex-1 text-ink-300">{binLabel(b)}</span>
                      <span className="font-mono">{formatActivity(b.value)}</span>
                      <span className="w-12 text-right font-mono text-ink-300">
                        {Math.round((b.value / total) * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-caption text-ink-300">
                  Temperatura de brilho do pixel mais quente de cada detecção, não a temperatura da chama.
                </p>
              </>
            ) : (
              <p className="mt-2 text-small text-ink-300">
                {total > 0
                  ? "Faixas de temperatura indisponíveis para este dia."
                  : "Sem atividade para repartir por temperatura."}
              </p>
            )}
          </section>
        </>
      )}
    </article>
  );
}
