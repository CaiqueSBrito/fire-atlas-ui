import { formatShort } from "@/lib/utils/dates";
import type { ActivityDay, MonthAnomaly } from "@/types/calendar";
import { formatActivity } from "../temperature";

const row = "flex items-baseline justify-between gap-3 rounded-xl border border-space-600 bg-space-900 px-4 py-3 type-body-small";

function anomalyText(anomaly: MonthAnomaly | undefined, failed: boolean): string {
  if (failed) return "Unavailable";
  if (!anomaly) return "…";
  if (!anomaly.sufficient || anomaly.deviationPct === null) return "Unavailable";
  const pct = Math.round(anomaly.deviationPct);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

export function MonthSummary({
  days,
  anomaly,
  anomalyFailed,
}: {
  days: ActivityDay[];
  anomaly: MonthAnomaly | undefined;
  anomalyFailed: boolean;
}) {
  const withData = days.filter((d) => d.status !== "unavailable");
  const peak = withData.reduce<ActivityDay | null>(
    (best, d) => ((d.value ?? 0) > (best?.value ?? 0) ? d : best),
    null,
  );
  const total = withData.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <article aria-labelledby="month-summary-title" className="rounded-panel border border-space-600 bg-space-800 p-6">
      <h3 id="month-summary-title" className="font-display type-heading-section">
        Monthly summary
      </h3>
      <dl className="mt-3 grid gap-2">
        <div className={row}>
          <dt className="text-ink-300">Days with data</dt>
          <dd className="font-mono font-bold">{withData.length}</dd>
        </div>
        <div className={row}>
          <dt className="text-ink-300">Monthly activity</dt>
          <dd className="font-mono font-bold">{withData.length ? formatActivity(total) : "–"}</dd>
        </div>
        <div className={row}>
          <dt className="text-ink-300">Monthly peak</dt>
          <dd className="font-mono font-bold">
            {peak?.value ? `${formatShort(peak.date).slice(0, 5)} · ${formatActivity(peak.value)}` : "–"}
          </dd>
        </div>
        <div className={row}>
          <dt className="text-ink-300">Days without data</dt>
          <dd className="font-mono font-bold">{days.length - withData.length}</dd>
        </div>
        <div className={row}>
          <dt className="text-ink-300">Compared with the median of previous years</dt>
          <dd className="font-mono font-bold">{anomalyText(anomaly, anomalyFailed)}</dd>
        </div>
      </dl>
      {anomaly && !anomaly.sufficient && (
        <p className="mt-2 type-caption text-ink-300">
          Comparison requires at least {anomaly.minYears} previous years with data; {anomaly.yearsWithData} are available.
        </p>
      )}
      <p className="mt-2 type-caption text-ink-300">Days without data do not mean there was no fire.</p>
    </article>
  );
}
