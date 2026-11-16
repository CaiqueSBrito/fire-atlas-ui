"use client";

import { useQueryStates } from "nuqs";
import { useSyncExternalStore } from "react";
import { ErrorState } from "@/components/feedback/error-state";
import { getRegion } from "@/config/regions";
import { useMapLayers } from "@/hooks/use-map-layers";
import { ApiError, hasApi } from "@/lib/api/client";
import { isCovered } from "@/lib/api/coverage";
import { parseBbox, validateBbox } from "@/lib/utils/bbox";
import { parseMapPlace, readMapPlaceRaw, subscribeMapPlace } from "@/lib/utils/map-place";
import {
  formatMonthTitle,
  isValidDate,
  isValidMonth,
  monthOf,
  shiftDate,
  todayUtc,
} from "@/lib/utils/dates";
import type { ActivityDay } from "@/types/calendar";
import {
  useActivityMonth,
  useDaySatellites,
  useDetectionCoverage,
  useMonthAnomaly,
} from "../hooks/use-calendar-queries";
import { calendarParsers } from "../search-params";
import { DayMap } from "./day-map";
import { DayPanel } from "./day-panel";
import { MonthBars } from "./month-bars";
import { MonthPicker } from "./month-picker";
import { MonthSummary } from "./month-summary";

function defaultDate(days: ActivityDay[], today: string): string | null {
  const todayDay = days.find((d) => d.date === today);
  if (todayDay && todayDay.status !== "unavailable") return today;
  return days.findLast((d) => d.status !== "unavailable")?.date ?? null;
}

export function CalendarView() {
  const [params, setParams] = useQueryStates(calendarParsers);
  const [layers] = useMapLayers();
  const today = todayUtc();

  const urlDate = isValidDate(params.date) ? params.date : null;
  const month = isValidMonth(params.month) ? params.month : monthOf(urlDate ?? today);
  const region = getRegion(params.region);
  const parsedBbox = parseBbox(params.bbox);
  const placeRaw = useSyncExternalStore(subscribeMapPlace, readMapPlaceRaw, () => null);
  const remembered = parseMapPlace(placeRaw);
  const viewBbox =
    parsedBbox && !validateBbox(parsedBbox)
      ? parsedBbox
      : remembered && remembered.region === region.id
        ? remembered.bbox
        : null;

  const monthQuery = useActivityMonth(month, region.id);
  const anomalyQuery = useMonthAnomaly(month, region.id);
  const data = monthQuery.data;
  const coverageQuery = useDetectionCoverage();
  const days = data?.month === month && data.region === region.id ? data.days : [];
  const coveredDays = coverageQuery.data ? days.filter((d) => isCovered(coverageQuery.data, d.date)) : days;
  const defaultDays = coveredDays.length ? coveredDays : days;
  const date = urlDate && monthOf(urlDate) === month
    ? urlDate
    : hasApi && coverageQuery.isPending
      ? null
      : defaultDate(defaultDays, today);
  const selectedDay = days.find((d) => d.date === date) ?? null;
  const satellitesQuery = useDaySatellites(selectedDay && selectedDay.status !== "unavailable" ? date : null);

  const selectDate = (d: string) => setParams({ date: d, month: monthOf(d) });

  return (
    <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-page pb-16 pt-10">
      <header>
        <p className="type-overline text-ember-400">Activity calendar</p>
        <h1 className="mt-2 font-display type-statement">Fire calendar</h1>
        <p className="mt-3 max-w-2xl type-body text-ink-300">
          Daily harmonized fire activity: MODIS and VIIRS on a single scale, separated by brightness temperature
          bands.
          {data?.source.simulated && (
            <span className="ml-2 rounded-full border border-ember-400/50 px-2 py-0.5 type-caption text-ember-400">
              Simulated data
            </span>
          )}
        </p>
      </header>

      <div className="mt-8 flex justify-end">
        <div className="flex shrink-0 flex-wrap items-center gap-2 whitespace-nowrap">
          <div className="flex items-center rounded-full border border-space-600 bg-space-900 p-1">
            <MonthPicker month={month} date={date} onSelectDate={selectDate} />
          </div>
          <button
            type="button"
            onClick={() => selectDate(today)}
            className="inline-flex h-10 items-center rounded-full border border-space-600 bg-space-800 px-4 type-button-small text-ink-100 transition-colors hover:border-ink-300"
          >
            Today
          </button>
        </div>
      </div>

      {monthQuery.isError && !data ? (
        <div className="mt-6">
          <ErrorState
            message={monthQuery.error instanceof Error ? monthQuery.error.message : "Failed to load the month."}
            onRetry={monthQuery.error instanceof ApiError && !monthQuery.error.recoverable ? undefined : () => void monthQuery.refetch()}
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-12" aria-busy={monthQuery.isFetching}>
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
            <section aria-label="Daily fire detection map" className="overflow-hidden rounded-panel border border-space-600">
              <div className="aspect-[16/10] max-h-[34rem] w-full">
                {date ? (
                  <DayMap region={region} date={date} viewBbox={viewBbox} layers={layers} />
                ) : (
                  <div className="grid h-full place-items-center bg-space-900 p-6 text-center type-body-small text-ink-300">
                    {monthQuery.isPending ? "Loading…" : "No days with data this month."}
                  </div>
                )}
              </div>
            </section>
            {monthQuery.isPending ? (
              <div role="status" className="h-72 animate-pulse rounded-panel bg-space-800">
                <span className="sr-only">Loading month…</span>
              </div>
            ) : (
              <MonthBars
                title={`Activity in ${formatMonthTitle(month)}`}
                days={days}
                selected={date}
                today={today}
                onSelect={selectDate}
              />
            )}
            {monthQuery.isError && data && (
              <ErrorState
                title="Could not update the month"
                message={monthQuery.error instanceof Error ? monthQuery.error.message : undefined}
                onRetry={monthQuery.error instanceof ApiError && !monthQuery.error.recoverable ? undefined : () => void monthQuery.refetch()}
              />
            )}
          </div>

          <aside aria-label="Details" className="flex flex-col gap-6 lg:col-span-4">
            <DayPanel
              day={selectedDay}
              unitLabel={data?.unitLabel ?? ""}
              satellites={satellitesQuery.data ?? null}
              canGoNext={!!date && date < today}
              onPrev={() => date && selectDate(shiftDate(date, -1))}
              onNext={() => date && selectDate(shiftDate(date, 1))}
            />
            <MonthSummary days={days} anomaly={anomalyQuery.data} anomalyFailed={anomalyQuery.isError} />
            {!!data?.warnings.length && (
              <details className="group rounded-panel border border-space-600 bg-space-800 p-6 type-body-small">
                <summary className="flex min-h-10 items-center justify-between gap-4 type-heading-card">
                  About these data
                  <span aria-hidden="true" className="text-ember-400 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <ul className="mt-2 grid list-disc gap-1.5 pl-5 text-ink-300">
                  {data.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </details>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
