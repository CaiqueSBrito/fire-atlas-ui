import { formatLong } from "@/lib/utils/dates";
import type { ActivityDay, DaySatellites } from "@/types/calendar";
import { BASIS_LABEL, binColor, binLabel, formatActivity, stackOrder } from "../temperature";

const STATUS: Record<ActivityDay["status"], { glyph: string; label: string }> = {
  activity: { glyph: "●", label: "Activity recorded" },
  none: { glyph: "○", label: "No activity recorded" },
  unavailable: { glyph: "×", label: "No data" },
};

const navButton =
  "inline-flex h-10 flex-1 items-center justify-center rounded-full border border-space-600 type-button-small transition-colors hover:border-ember-400 hover:text-ember-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-space-600 disabled:hover:text-ink-100";

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
      <article className="rounded-panel border border-space-600 bg-space-800 p-6">
        <p className="type-overline text-ember-400">Selected day</p>
        <p className="mt-2 type-body text-ink-300">Choose a day in the bars to view details.</p>
      </article>
    );
  }

  const status = STATUS[day.status];
  const bins = day.temperature ? stackOrder(day.temperature).reverse() : null;
  const total = day.value ?? 0;

  return (
    <article aria-labelledby="day-panel-title" className="rounded-panel border border-space-600 bg-space-800 p-6">
      <p className="type-overline text-ember-400">Selected day</p>
      <h2
        id="day-panel-title"
        aria-live="polite"
        className="mt-2 font-display type-heading-page"
      >
        {formatLong(day.date)}
      </h2>
      <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-space-600 bg-space-950/60 px-3 py-1 type-label-small">
        <span aria-hidden="true" className="font-mono text-ember-400">
          {status.glyph}
        </span>
        {status.label}
      </p>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onPrev} className={navButton}>
          ‹ Previous
        </button>
        <button type="button" onClick={onNext} disabled={!canGoNext} className={navButton}>
          Next ›
        </button>
      </div>

      {day.status === "unavailable" ? (
        <p className="mt-6 rounded-xl border border-dashed border-space-600 bg-space-900 px-4 py-3 type-body-small text-ink-300">
          No satellite contributed data for this day. This does not mean there was no fire.
        </p>
      ) : (
        <>
          <div className="mt-6 rounded-xl border border-space-600 bg-space-900 p-4">
            <p className="type-label-small text-ink-300">Harmonized activity</p>
            <p className="mt-1 font-mono type-kpi">{formatActivity(total)}</p>
            <p className="mt-2 type-caption text-ink-300">{unitLabel}. This is not a count of fire detections.</p>
          </div>

          <dl className="mt-3 grid gap-2 type-body-small">
            <div className="flex justify-between gap-3 rounded-xl border border-space-600 bg-space-900 px-4 py-3">
              <dt className="text-ink-300">Contributing satellites</dt>
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
              <div className="flex justify-between gap-3 rounded-xl border border-space-600 bg-space-900 px-4 py-3">
                <dt className="text-ink-300">Temperature measured by</dt>
                <dd className="whitespace-nowrap text-right font-mono">{BASIS_LABEL[day.basis]}</dd>
              </div>
            )}
          </dl>

          <section aria-labelledby="day-temp-title" className="mt-6">
            <h3 id="day-temp-title" className="font-display type-heading-card">
              By brightness temperature
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
                <ul className="mt-3 grid gap-2 type-body-small">
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
                <p className="mt-2 type-caption text-ink-300">
                  Brightness temperature of the hottest pixel in each detection, not flame temperature.
                </p>
              </>
            ) : (
              <p className="mt-2 type-body-small text-ink-300">
                {total > 0
                  ? "Temperature bands unavailable for this day."
                  : "No activity to break down by temperature."}
              </p>
            )}
          </section>
        </>
      )}
    </article>
  );
}
