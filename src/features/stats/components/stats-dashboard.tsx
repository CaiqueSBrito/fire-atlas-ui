"use client";

import { useState } from "react";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { REGIONS } from "@/config/regions";
import { useCellHistory, useHarmonizedMonthly, useStats } from "@/hooks/use-detections";
import { ApiError, hasApi } from "@/lib/api/client";
import { SENSOR_META } from "@/lib/sensors";
import { HarmonizedMonthlyPanel } from "./harmonized-monthly";
import { HistoryComparison } from "./history-comparison";
import { IndicatorCards } from "./indicator-cards";
import { CriticalPeriods, RankingPanel } from "./insight-panels";

const fmtDate = (d: string) => `${d.slice(5, 7)}/${d.slice(8, 10)}/${d.slice(0, 4)}`;

export function StatsDashboard() {
  const { data, error, isPending, isFetching, refetch, filters, enabled } = useStats();
  const monthly = useHarmonizedMonthly();
  const [chosenCell, setChosenCell] = useState<string | null>(null);
  const rankedCells = (data?.ranking?.items ?? []).flatMap((item) => item.h3 ? [item.h3] : []);
  const selectedCell =
    chosenCell && rankedCells.includes(chosenCell) ? chosenCell : (rankedCells[0] ?? null);
  const cellHistory = useCellHistory(selectedCell);
  const regionLabel = filters.customArea
    ? "Custom area"
    : REGIONS.find((r) => r.id === filters.regionId)?.label ?? filters.regionId;
  const sensorsLabel =
    filters.sensors.map((s) => SENSOR_META[s].label).join(" + ") || "no sensors";

  let body: React.ReactNode;
  if (filters.problem) {
    body = <ErrorState title="Invalid filter" message={`${filters.problem} Adjust the filters to retrieve data.`} />;
  } else if (filters.sensors.length === 0) {
    body = <EmptyState title="No sensors selected" description="Enable MODIS and/or VIIRS in the filters to view indicators." />;
  } else if (enabled && isPending) {
    body = <LoadingState label="Loading indicators…" />;
  } else if (error) {
    body = <ErrorState message={error.message} onRetry={error instanceof ApiError && !error.recoverable ? undefined : () => void refetch()} />;
  } else if (data) {
    const empty =
      data.series.length === 0 ||
      filters.sensors.every((s) => (data.bySensor[s] ?? 0) === 0);
    body = (
      <div className="flex flex-col gap-6" aria-busy={isFetching}>
        <IndicatorCards stats={data} sensors={filters.sensors} />
        {empty && (
          <EmptyState
            title="No detections recorded in this area"
            description="This does not mean there was no fire: satellite observations are limited by coverage, overpass times, and clouds."
          />
        )}
        <HarmonizedMonthlyPanel
          data={monthly.data}
          isPending={monthly.isPending}
          error={monthly.error}
          onRetry={() => void monthly.refetch()}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <HistoryComparison
            enabled={hasApi}
            cell={selectedCell}
            history={cellHistory.data}
            isPending={cellHistory.isPending}
            error={cellHistory.error}
            onRetry={() => void cellHistory.refetch()}
          />
          <div className="flex flex-col gap-6">
            <RankingPanel ranking={data.ranking} selectedCell={selectedCell} onSelectCell={setChosenCell} />
            <CriticalPeriods data={data.criticalPeriods} />
          </div>
        </div>

        <section aria-labelledby="meta-title" className="rounded-2xl border border-space-600 bg-space-900 p-5 text-small text-ink-300">
          <h2 id="meta-title" className="font-display text-base font-bold text-ink-100">
            Metadata
          </h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt>Source</dt>
            <dd className="text-ink-100">
              {data.source.name}
              {data.source.simulated && " — simulated (prototype)"}
            </dd>
            <dt>Units</dt>
            <dd className="text-ink-100">detections (count); FRP in MW when provided</dd>
            <dt>Original data</dt>
            <dd className="text-ink-100">MODIS ◆ and VIIRS ● — preserved unchanged</dd>
            <dt>Harmonized data</dt>
            <dd className="text-ink-100">
              ▲ blue — monthly harmonized activity (gold/harmonized), in MODIS
              Aqua-equivalent active cells; API only
            </dd>
          </dl>
        </section>
      </div>
    );
  }

  return (
    <PageSection
      title="Analytics"
      description={`Indicators for ${regionLabel}, from ${fmtDate(filters.from)} to ${fmtDate(filters.to)} · ${sensorsLabel}. The same filters as the map and calendar.`}
    >
      {body}
    </PageSection>
  );
}
