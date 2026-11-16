import { cellToLatLng } from "h3-js";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { ApiError } from "@/lib/api/client";
import type { CellHistory } from "@/types/stats";
import { Unavailable } from "./unavailable";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });

function cellPosition(cell: string) {
  try {
    const [lat, lon] = cellToLatLng(cell);
    return `${Math.abs(lat).toFixed(2)}° ${lat < 0 ? "S" : "N"}, ${Math.abs(lon)
      .toFixed(2)
      }° ${lon < 0 ? "W" : "E"}`;
  } catch {
    return null;
  }
}

type HistoryComparisonProps = {
  enabled: boolean;
  cell: string | null;
  history: CellHistory | null | undefined;
  isPending: boolean;
  error: Error | null;
  onRetry: () => void;
};

export function HistoryComparison({ enabled, cell, history, isPending, error, onRetry }: HistoryComparisonProps) {
  let body: React.ReactNode;
  if (!enabled) {
    body = (
      <Unavailable>
        Historical cell comparisons use real API data; previous-year series are unavailable without it.
      </Unavailable>
    );
  } else if (!cell) {
    body = (
      <Unavailable>
        No H3 cells in the ranking for this area. Choose a region or period with detections.
      </Unavailable>
    );
  } else if (isPending) {
    body = <LoadingState label="Loading previous years…" />;
  } else if (error) {
    body = (
      <ErrorState
        message={error.message}
        onRetry={error instanceof ApiError && !error.recoverable ? undefined : onRetry}
      />
    );
  } else if (!history) {
    body = <Unavailable>The API did not return a comparison for the selected sensors.</Unavailable>;
  } else {
    body = <Body h={history} />;
  }

  return (
    <section aria-labelledby="history-title" className="rounded-2xl border border-space-600 bg-space-800 p-5">
      <h2 id="history-title" className="font-display text-lg font-bold">
        Historical comparison
      </h2>
      <p className="mt-1 text-small text-ink-300">
        The month for the H3 cell selected in the ranking compared with the same dates in the previous 5 years.
      </p>
      <div className="mt-3">{body}</div>
    </section>
  );
}

function Body({ h }: { h: CellHistory }) {
  const position = cellPosition(h.cell);
  const byYear = new Map(h.years.map((year) => [year.year, year.detections]));
  const previous = Array.from({ length: h.yearsRequested }, (_, i) => h.current.year - h.yearsRequested + i);
  const max = Math.max(h.current.detections, ...h.years.map((year) => year.detections), 1);
  const rows = [
    ...previous.map((year) => ({ year, value: byYear.get(year) ?? null, current: false })),
    { year: h.current.year, value: h.current.detections, current: true },
  ];
  const period = [h.start, h.end].map((date) => `${date.slice(5, 7)}/${date.slice(8, 10)}`).join(" to ");

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-small">
        <dt className="text-ink-300">Cell</dt>
        <dd>
          <span className="font-mono">{h.cell}</span>
          {position && <span className="text-ink-300"> · {position}</span>}
        </dd>
        <dt className="text-ink-300">Period</dt>
        <dd>
          {period} ({h.days} {h.days === 1 ? "day" : "days"}) of each year
        </dd>
      </dl>

      <ul aria-label="Detections during the same dates each year" className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.year} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 text-small">
            <span className={row.current ? "font-semibold text-ink-100" : "text-ink-300"}>{row.year}</span>
            <span className="h-3 rounded-full bg-space-900">
              {row.value !== null && (
                <span
                  className={`block h-3 rounded-full ${row.current ? "bg-ember-400" : "bg-ink-300"}`}
                  style={{ width: `${(row.value / max) * 100}%` }}
                />
              )}
            </span>
            <span className="font-mono">
              {row.value === null ? <span className="text-ink-300">no records</span> : `${fmt(row.value)} detections`}
            </span>
          </li>
        ))}
      </ul>

      {h.sufficient && h.meanPerDay !== null ? (
        <div className="flex flex-col gap-1">
          <p className="font-mono text-h2 font-bold">
            {h.changePct === null
              ? "—"
              : `${h.changePct > 0 ? "+" : h.changePct < 0 ? "−" : ""}${fmt(Math.abs(h.changePct))}%`}
            <span className="ml-2 text-small font-normal text-ink-300">compared with the average of previous years</span>
          </p>
          <p className="text-small text-ink-300">
            {fmt(h.currentPerDay)} detections/day now versus {fmt(h.meanPerDay)} averaged over {h.yearsWithData}{" "}
            {h.yearsWithData === 1 ? "year" : "years"} with records.{" "}
            {h.anomalousSensors.length > 0
              ? `Anomalous for ${h.anomalousSensors.join(" and ")} (|z| ≥ 2).`
              : "Within the usual range (|z| < 2)."}
          </p>
        </div>
      ) : (
        <Unavailable>
          Comparison unavailable: {h.yearsWithData} {h.yearsWithData === 1 ? "previous year" : "previous years"} with
          records in this cell; required: {h.minYears}.
          {h.notes.length > 0 && ` ${h.notes.join(" ")}`}
        </Unavailable>
      )}

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-small">
        <dt className="text-ink-300">Method</dt>
        <dd>
          Detections per day during this period compared with the average for the same dates in previous years with records; anomalous if
          |z| ≥ 2 for any sensor.
        </dd>
        <dt className="text-ink-300">Caution</dt>
        <dd>
          MODIS and VIIRS are summed when both are selected, but are not directly comparable.
          A year without records is not a year without fire.
        </dd>
      </dl>
    </div>
  );
}
