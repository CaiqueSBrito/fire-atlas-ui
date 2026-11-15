"use client";

import { useQueryStates } from "nuqs";
import { ErrorState } from "@/components/feedback/error-state";
import { Select } from "@/components/ui/select";
import { REGIONS, getRegion } from "@/config/regions";
import { useMapLayers } from "@/hooks/use-map-layers";
import { cn } from "@/lib/utils/cn";
import { ApiError, hasApi } from "@/lib/api/client";
import { isCovered } from "@/lib/api/coverage";
import { parseBbox, validateBbox } from "@/lib/utils/bbox";
import {
  formatMonthTitle,
  isValidDate,
  isValidMonth,
  monthOf,
  shiftDate,
  shiftMonth,
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

const CHIP_IDS = ["world", "south-america", "north-america", "europe", "africa", "asia", "oceania"];
const CHIPS = REGIONS.filter((r) => CHIP_IDS.includes(r.id));
const OTHER_OPTIONS = [
  { value: "", label: "Brasil e estados" },
  ...REGIONS.filter((r) => !CHIP_IDS.includes(r.id)).map((r) => ({ value: r.id, label: r.label })),
];

const chip =
  "inline-flex h-12 items-center rounded-full border px-4 text-base font-semibold leading-6 tracking-[-0.02em] transition-colors duration-200";
const roundNav =
  "grid h-10 w-10 place-items-center rounded-full text-lg text-ink-100 transition hover:bg-space-800 hover:text-ember-400";

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
  const viewBbox = parsedBbox && !validateBbox(parsedBbox) ? parsedBbox : null;

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
  const selectRegion = (id: string) => setParams({ region: id, bbox: null });

  return (
    <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-6 pb-14 pt-8 sm:px-10">
      <header>
        <p className="font-mono text-caption uppercase tracking-[0.2em] text-ember-400">Calendário de atividade</p>
        <h1 className="mt-1 font-display text-h1 font-bold leading-tight tracking-tight">Calendário de queimadas</h1>
        <p className="mt-2 max-w-2xl text-ink-300">
          Atividade de fogo harmonizada por dia: MODIS e VIIRS numa só escala, separada por faixa de temperatura de
          brilho.
          {data?.source.simulated && (
            <span className="ml-2 rounded-full border border-ember-400/50 px-2 py-0.5 text-caption text-ember-400">
              Dados simulados
            </span>
          )}
        </p>
      </header>

      <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Região" className="contents">
            {CHIPS.map((r) => {
              const active = r.id === region.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectRegion(r.id)}
                  className={cn(
                    chip,
                    active
                      ? "border-ember-400 text-ember-400"
                      : "border-space-600 text-ink-100 hover:border-ember-400 hover:text-ember-400",
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </nav>
          <div className="w-56">
            <Select
              label="Outra região"
              hideLabel
              buttonClassName="min-h-12 rounded-full py-2 px-4 font-semibold"
              value={CHIP_IDS.includes(region.id) ? "" : region.id}
              options={OTHER_OPTIONS}
              onChange={(id) => id && selectRegion(id)}
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 whitespace-nowrap">
          <div className="flex items-center rounded-full border border-space-600 bg-space-900 p-1">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => setParams({ month: shiftMonth(month, -1), date: null })}
              className={roundNav}
            >
              ‹
            </button>
            <MonthPicker month={month} onChange={(m) => setParams({ month: m, date: null })} />
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => setParams({ month: shiftMonth(month, 1), date: null })}
              className={roundNav}
            >
              ›
            </button>
          </div>
          <button
            type="button"
            onClick={() => selectDate(today)}
            className="inline-flex h-12 items-center rounded-full border border-space-600 bg-space-800 px-5 font-semibold text-ink-100 transition-colors hover:border-ink-300"
          >
            Hoje
          </button>
        </div>
      </div>

      {monthQuery.isError && !data ? (
        <div className="mt-6">
          <ErrorState
            message={monthQuery.error instanceof Error ? monthQuery.error.message : "Falha ao carregar o mês."}
            onRetry={monthQuery.error instanceof ApiError && !monthQuery.error.recoverable ? undefined : () => void monthQuery.refetch()}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-12" aria-busy={monthQuery.isFetching}>
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
            <section aria-label="Mapa de focos do dia" className="overflow-hidden rounded-2xl border border-space-600">
              <div className="aspect-[16/10] max-h-[34rem] w-full">
                {date ? (
                  <DayMap region={region} date={date} viewBbox={viewBbox} layers={layers} />
                ) : (
                  <div className="grid h-full place-items-center bg-space-900 p-6 text-center text-small text-ink-300">
                    {monthQuery.isPending ? "Carregando…" : "Nenhum dia com dado neste mês."}
                  </div>
                )}
              </div>
            </section>
            {monthQuery.isPending ? (
              <div role="status" className="h-72 animate-pulse rounded-2xl bg-space-800">
                <span className="sr-only">Carregando o mês…</span>
              </div>
            ) : (
              <MonthBars
                title={`Atividade em ${formatMonthTitle(month).split(" de ")[0].toLowerCase()}`}
                days={days}
                selected={date}
                today={today}
                onSelect={selectDate}
              />
            )}
            {monthQuery.isError && data && (
              <ErrorState
                title="Não foi possível atualizar o mês"
                message={monthQuery.error instanceof Error ? monthQuery.error.message : undefined}
                onRetry={monthQuery.error instanceof ApiError && !monthQuery.error.recoverable ? undefined : () => void monthQuery.refetch()}
              />
            )}
          </div>

          <aside aria-label="Detalhes" className="flex flex-col gap-6 lg:col-span-4">
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
              <details className="group rounded-2xl border border-space-600 bg-space-800 p-5 text-small">
                <summary className="flex min-h-11 items-center justify-between gap-4 font-semibold">
                  Sobre estes dados
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
