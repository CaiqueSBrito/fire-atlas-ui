"use client";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { REGIONS } from "@/config/regions";
import { Unavailable } from "@/features/stats/components/unavailable";
import { useForecast } from "@/hooks/use-detections";
import { ApiError } from "@/lib/api/client";
import { bootstrapProgress } from "@/lib/api/bootstrap";
import type { Bbox } from "@/types/detections";
import type { ForecastResponse } from "@/types/forecast";
import { fmtCoords, fmtDate, fmtInt, fmtNum, fmtPct, place } from "../format";
import { ForecastMap } from "./forecast-map";

type Available = Extract<ForecastResponse, { status: "available" }>;

const TABLE_ROWS = 100;

function PredictedBanner() {
  return (
    <p
      role="note"
      className="rounded-xl border-2 border-dashed border-[#ff5a4f] bg-[#ff5a4f]/10 p-3 text-small"
    >
      <strong>FORECAST — not observed detections.</strong> Fire probability
      over the 7 days after issuance, calculated by the data pipeline model.
    </p>
  );
}

function Card({
  label,
  value,
  unit,
  unavailable,
}: {
  label: string;
  value: string | null;
  unit?: string;
  unavailable: string;
}) {
  return (
    <div className="rounded-2xl border border-space-600 bg-space-800 p-5">
      <p className="text-small text-ink-300">{label}</p>
      {value === null ? (
        <>
          <p className="mt-1 font-mono text-h2 font-bold text-ink-300">—</p>
          <p className="text-caption text-ink-300">Unavailable: {unavailable}</p>
        </>
      ) : (
        <p className="mt-1 font-mono text-h2 font-bold">
          {value}
          {unit && <span className="ml-2 text-small font-normal text-ink-300">{unit}</span>}
        </p>
      )}
    </div>
  );
}


function RiskTable({ data }: { data: Available }) {
  const rows = data.cells.slice(0, TABLE_ROWS);
  return (
    <details className="group rounded-2xl border border-space-600 bg-space-800 p-5">
      <summary className="cursor-pointer font-display text-lg font-bold">
        View cell table ({fmtInt(rows.length)} highest-probability cells)
      </summary>
      <p className="mt-1 text-small text-ink-300">
        Nearest city and distance according to the places database. The table shows the {fmtInt(rows.length)} highest-probability cells among the {fmtInt(data.cells.length)} displayed on the map.
      </p>
      <div className="mt-3 max-h-[32rem] overflow-auto rounded-lg border border-space-600">
        <table className="w-full text-small">
          <caption className="sr-only">
            H3 cells ranked from highest to lowest 7-day fire probability
          </caption>
          <thead className="sticky top-0 bg-space-900">
            <tr>
              <th scope="col" className="px-3 py-2 text-left">#</th>
              <th scope="col" className="px-3 py-2 text-left">Location</th>
              <th scope="col" className="px-3 py-2 text-left">Coordinates</th>
              <th scope="col" className="px-3 py-2 text-right">7-day probability</th>
              <th scope="col" className="px-3 py-2 text-right">24-hour detections</th>
              <th scope="col" className="px-3 py-2 text-right">7-day detections</th>
              <th scope="col" className="px-3 py-2 text-right">7-day mean FRP (MW)</th>
              <th scope="col" className="px-3 py-2 text-left">Active fire</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={c.id} className="border-t border-space-600">
                <td className="px-3 py-1.5 font-mono text-ink-300">{i + 1}</td>
                <th scope="row" className="px-3 py-1.5 text-left font-normal">
                  {place(c)}
                  <span className="block font-mono text-caption text-ink-300">{c.id}</span>
                </th>
                <td className="px-3 py-1.5 font-mono">{fmtCoords(c)}</td>
                <td className="px-3 py-1.5 text-right font-mono">{fmtPct(c.probability)}%</td>
                <td className="px-3 py-1.5 text-right font-mono">{fmtNum(c.detections24h, 0)}</td>
                <td className="px-3 py-1.5 text-right font-mono">{fmtNum(c.detections7d, 0)}</td>
                <td className="px-3 py-1.5 text-right font-mono">{fmtNum(c.frpMean7d)}</td>
                <td className="px-3 py-1.5">
                  {c.active === null ? "—" : c.active ? "Yes" : "No"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Report({ data, regionBbox }: { data: Available; regionBbox: Bbox }) {
  const { summary } = data;
  return (
    <div className="flex flex-col gap-6">
      <PredictedBanner />
      <section aria-label="Indicators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          label="Cells with forecasts"
          value={fmtInt(summary.cells)}
          unit="H3 cells"
          unavailable="not provided by the API"
        />
        <Card
          label="Cells with active fire"
          value={fmtInt(summary.activeCells)}
          unit="H3 cells"
          unavailable="not provided by the API"
        />
        <Card
          label="Highest probability"
          value={fmtPct(summary.maxProbability)}
          unit="%"
          unavailable="no cells in the region"
        />
        <Card
          label="Mean probability"
          value={fmtPct(summary.meanProbability)}
          unit="%"
          unavailable="no cells in the region"
        />
      </section>

      {summary.cells === 0 ? (
        <EmptyState
          title="No cells with forecasts in this region"
          description="The model did not generate a forecast for this area in the latest issue. This does not mean there is no fire risk."
        />
      ) : (
        <>
          <ForecastMap
            cells={data.cells}
            totalCells={data.summary.cells}
            truncated={data.truncated}
            regionBbox={regionBbox}
          />
          <RiskTable data={data} />
        </>
      )}

      <section
        aria-labelledby="forecast-meta-title"
        className="rounded-2xl border border-space-600 bg-space-900 p-5 text-small text-ink-300"
      >
        <h2 id="forecast-meta-title" className="font-display text-base font-bold text-ink-100">
          Metadata
        </h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt>Issue date</dt>
          <dd className="font-mono text-ink-100">{fmtDate(data.issueDate)}</dd>
          <dt>Source</dt>
          <dd className="text-ink-100">{data.source}</dd>
          <dt>Method</dt>
          <dd className="text-ink-100">{data.method}</dd>
          <dt>Spatial unit</dt>
          <dd className="text-ink-100">Native H3 resolution 6 cells from gold/forecast; model probabilities are not reaggregated</dd>
        </dl>
      </section>
    </div>
  );
}

export function ForecastView() {
  const { data, error, isPending, isFetching, refetch, filters, enabled, bootstrap } = useForecast();
  const regionLabel = filters.customArea
    ? "Custom area"
    : REGIONS.find((r) => r.id === filters.regionId)?.label ?? filters.regionId;
  const issue = data?.status === "available" ? ` · issued on ${fmtDate(data.issueDate)}` : "";
  const loadingPercent = bootstrap.data ? bootstrapProgress(bootstrap.data) : 0;

  let body: React.ReactNode;
  if (filters.problem) {
    body = (
      <ErrorState
        title="Invalid filter"
        message={`${filters.problem} Adjust the filters to retrieve data.`}
      />
    );
  } else if (bootstrap.error || bootstrap.data?.state === "failed") {
    body = (
      <ErrorState
        title="Could not load forecasts"
        message={bootstrap.error?.message ?? bootstrap.data?.error ?? bootstrap.data?.message ?? "Loading interrupted."}
        onRetry={() => bootstrap.restart()}
      />
    );
  } else if (bootstrap.data?.state === "loading" || bootstrap.data?.state === "idle") {
    body = (
      <div className="space-y-3">
        <LoadingState label={bootstrap.data.message} />
        <div className="flex items-center gap-3">
          <div
            role="progressbar"
            aria-label="Forecast data load"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={loadingPercent}
            aria-valuetext={`${loadingPercent}% · ${bootstrap.data.completedUnits} of ${bootstrap.data.totalUnits} files confirmed`}
            className="h-3 flex-1 overflow-hidden rounded-full bg-space-600"
          >
            <div
              className="h-full rounded-full bg-fire-400 transition-[width] duration-300"
              style={{ width: `${loadingPercent}%` }}
            />
          </div>
          <span className="font-mono text-small">{loadingPercent}%</span>
        </div>
        <p className="text-small text-ink-300">
          {fmtInt(bootstrap.data.completedUnits)} of {fmtInt(bootstrap.data.totalUnits)} files confirmed · {fmtInt(bootstrap.data.rowsLoaded)} rows.
          {" "}You can browse the project; loading continues in the background.
        </p>
      </div>
    );
  } else if (enabled && isPending) {
    body = <LoadingState label="Loading forecasts…" />;
  } else if (error) {
    body = (
      <ErrorState
        message={error.message}
        onRetry={error instanceof ApiError && !error.recoverable ? undefined : () => void refetch()}
      />
    );
  } else if (data?.status === "unavailable") {
    body = <Unavailable>{data.reason} No estimates are displayed without a forecast from the service.</Unavailable>;
  } else if (data) {
    body = (
      <div aria-busy={isFetching}>
        <Report data={data} regionBbox={filters.bbox} />
      </div>
    );
  }

  return (
    <PageSection
      title="Forecasts"
      description={`Fire risk report for ${regionLabel}${issue}. Uses the filtered region; date range and sensors do not apply (the forecast covers the 7 days after issuance).`}
    >
      {body}
    </PageSection>
  );
}
