"use client";

import { ErrorState } from "@/components/feedback/error-state";
import {
  firstWeekday,
  monthOf,
  shiftMonth,
  todayUtc,
} from "@/lib/utils/dates";
import type { DayStatus } from "@/types/calendar";
import { useMonthQuery } from "../hooks/use-calendar-queries";
import { DayTile, STATUS_META } from "./day-tile";
import { FlameIcon } from "./flame-icon";
import { MonthPicker } from "./month-picker";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const STATUSES: DayStatus[] = ["activity", "none", "unavailable"];
const STAT_LABEL: Record<DayStatus, string> = {
  activity: "com atividade",
  none: "sem registro",
  unavailable: "indisponíveis",
};

const navBtn =
  "grid h-10 w-10 place-items-center rounded-xl text-lg text-ink-100 transition hover:bg-space-800 hover:text-ember-400";

type CalendarPanelProps = {
  month: string;
  region: string;
  selectedDate: string | null;
  onMonthChange: (month: string) => void;
  onSelectDate: (date: string) => void;
  onClose: () => void;
};

export function CalendarPanel({
  month,
  region,
  selectedDate,
  onMonthChange,
  onSelectDate,
  onClose,
}: CalendarPanelProps) {
  const query = useMonthQuery(month, region);
  const offset = firstWeekday(month);
  const today = todayUtc();
  const stats = STATUSES.map(
    (s) => query.data?.days.filter((d) => d.status === s).length ?? null,
  );

  return (
    <aside
      aria-label="Calendário de queimadas"
      className="panel-surface h-full w-full border-b border-space-600 p-5 lg:w-[30rem] lg:border-b-0 lg:border-r"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-ember-400/30 bg-gradient-to-br from-fire-500/30 to-ember-400/10 shadow-[0_0_22px_rgba(229,36,43,0.3)]">
          <FlameIcon className="h-6 w-[1.125rem]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-caption uppercase tracking-[0.2em] text-ink-300">
            Baralho do mês
          </p>
          <p className="truncate text-small text-ink-100">
            Escolha uma carta para explorar o dia
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-expanded="true"
          aria-controls="calendar-grid"
          aria-label="Recolher calendário"
          title="Recolher calendário"
          className="grid h-10 w-10 place-items-center rounded-xl border border-space-600 text-ink-100 transition hover:border-ember-400 hover:text-ember-400"
        >
          <span aria-hidden="true">«</span>
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-2xl border border-space-600 bg-space-950/60 p-1.5">
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          aria-label="Mês anterior"
          className={navBtn}
        >
          ‹
        </button>
        <MonthPicker month={month} onChange={onMonthChange} />
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          aria-label="Próximo mês"
          className={navBtn}
        >
          ›
        </button>
      </div>

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => onMonthChange(monthOf(today))}
          disabled={month === monthOf(today)}
          className="text-caption text-ink-300 underline-offset-4 hover:text-ember-400 hover:underline disabled:no-underline disabled:opacity-40"
        >
          Ir para o mês atual
        </button>
      </div>

      <div id="calendar-grid" className="mt-3">
        {query.isError ? (
          <ErrorState
            message={
              query.error instanceof Error
                ? query.error.message
                : "Falha ao carregar o mês."
            }
            onRetry={() => query.refetch()}
          />
        ) : (
          <>
            <div
              className="grid grid-cols-7 gap-1.5 text-center text-caption font-semibold uppercase tracking-wider text-ink-300"
              aria-hidden="true"
            >
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div
              className="mt-2 grid grid-cols-7 gap-1.5"
              aria-busy={query.isPending}
            >
              {Array.from({ length: offset }, (_, i) => (
                <span key={`pad-${i}`} aria-hidden="true" />
              ))}
              {query.isPending
                ? Array.from({ length: 30 }, (_, i) => (
                    <span
                      key={i}
                      className="aspect-[3/4] animate-pulse rounded-lg bg-space-800"
                    />
                  ))
                : query.data.days.map((day, i) => (
                    <DayTile
                      key={day.date}
                      index={i}
                      isToday={day.date === today}
                      day={day}
                      selected={day.date === selectedDate}
                      onSelect={onSelectDate}
                    />
                  ))}
            </div>
            {query.isPending && (
              <p className="mt-2 text-small text-ink-300" role="status">
                Carregando o mês…
              </p>
            )}
          </>
        )}
      </div>

      {/* Legenda + resumo do mês (símbolo + rótulo + contagem: nunca só cor) */}
      <ul className="mt-5 grid gap-2 text-small" aria-label="Resumo do mês">
        {STATUSES.map((s, i) => (
          <li
            key={s}
            className="flex items-center gap-3 rounded-xl border border-space-600 bg-space-950/50 px-3 py-2"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-space-800 font-mono text-caption text-ink-100">
              {STATUS_META[s].glyph}
            </span>
            <span className="flex-1 text-ink-300">{STATUS_META[s].label}</span>
            <span className="font-mono font-bold text-ink-100">
              {stats[i] === null ? "–" : `${stats[i]} ${stats[i] === 1 ? "dia" : "dias"}`}
            </span>
            <span className="sr-only">{STAT_LABEL[s]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-caption text-ink-300">
        Na carta, <span className="text-ember-400">◆</span> é MODIS e{" "}
        <span className="text-fire-400">●</span> é VIIRS, com a quantidade de
        focos de cada sensor — exibida apenas quando informada pela API.
      </p>
    </aside>
  );
}
