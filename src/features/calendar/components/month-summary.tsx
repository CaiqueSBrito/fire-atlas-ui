import { formatShort } from "@/lib/utils/dates";
import type { ActivityDay, MonthAnomaly } from "@/types/calendar";
import { formatActivity } from "../temperature";

const row = "flex items-baseline justify-between gap-3 rounded-xl border border-space-600 bg-space-900 px-4 py-3";

function anomalyText(anomaly: MonthAnomaly | undefined, failed: boolean): string {
  if (failed) return "Indisponível";
  if (!anomaly) return "…";
  if (!anomaly.sufficient || anomaly.deviationPct === null) return "Indisponível";
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
    <article aria-labelledby="month-summary-title" className="rounded-2xl border border-space-600 bg-space-800 p-6">
      <h3 id="month-summary-title" className="font-display text-xl font-bold">
        Resumo do mês
      </h3>
      <dl className="mt-3 grid gap-2">
        <div className={row}>
          <dt className="text-ink-300">Dias com dado</dt>
          <dd className="font-mono font-bold">{withData.length}</dd>
        </div>
        <div className={row}>
          <dt className="text-ink-300">Atividade no mês</dt>
          <dd className="font-mono font-bold">{withData.length ? formatActivity(total) : "–"}</dd>
        </div>
        <div className={row}>
          <dt className="text-ink-300">Pico do mês</dt>
          <dd className="font-mono font-bold">
            {peak?.value ? `${formatShort(peak.date).slice(0, 5)} · ${formatActivity(peak.value)}` : "–"}
          </dd>
        </div>
        <div className={row}>
          <dt className="text-ink-300">Dias sem dado</dt>
          <dd className="font-mono font-bold">{days.length - withData.length}</dd>
        </div>
        <div className={row}>
          <dt className="text-ink-300">Frente à mediana dos anos anteriores</dt>
          <dd className="font-mono font-bold">{anomalyText(anomaly, anomalyFailed)}</dd>
        </div>
      </dl>
      {anomaly && !anomaly.sufficient && (
        <p className="mt-2 text-caption text-ink-300">
          A comparação exige pelo menos {anomaly.minYears} anos anteriores com dado; há {anomaly.yearsWithData}.
        </p>
      )}
      <p className="mt-2 text-caption text-ink-300">Dias sem dado não significam ausência de fogo.</p>
    </article>
  );
}
