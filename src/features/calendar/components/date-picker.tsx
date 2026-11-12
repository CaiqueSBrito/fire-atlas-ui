"use client";

import { useRef, useState } from "react";
import { Chevron } from "@/components/ui/select";
import { useDismiss } from "@/hooks/use-dismiss";
import {
  daysInMonth,
  firstWeekday,
  formatMonthTitle,
  formatShort,
  monthOf,
  shiftMonth,
  todayUtc,
} from "@/lib/utils/dates";
import { MonthYearGrid } from "./month-year-grid";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

type DatePickerProps = {
  id: string;
  value: string;
  onChange: (date: string) => void;
};

// Seletor de data próprio (o nativo do navegador destoa do tema escuro).
export function DatePicker({ id, value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(monthOf(value));
  const [pickingMonth, setPickingMonth] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = todayUtc();

  useDismiss(open, ref, () => setOpen(false));

  const pick = (date: string) => {
    onChange(date);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Data: ${formatShort(value)}`}
        onClick={() => {
          setMonth(monthOf(value));
          setPickingMonth(false);
          setOpen((o) => !o);
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-space-900 px-3 py-2.5 text-left text-small text-ink-100 transition-colors ${
          open ? "border-ember-400" : "border-space-600 hover:border-ink-300"
        }`}
      >
        <span className="font-mono">{formatShort(value)}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Escolher data"
          className="pop-in absolute left-0 top-full z-30 mt-2 w-72 rounded-2xl border border-space-600 bg-space-900 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.6)]"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Mês anterior"
              tabIndex={pickingMonth ? -1 : undefined}
              onClick={() => setMonth(shiftMonth(month, -1))}
              className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-space-800 ${pickingMonth ? "invisible" : ""}`}
            >
              ‹
            </button>
            <button
              type="button"
              aria-expanded={pickingMonth}
              onClick={() => setPickingMonth((v) => !v)}
              title="Escolher mês e ano"
              aria-label={`${formatMonthTitle(month)} — escolher mês e ano`}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 font-display text-small font-bold hover:bg-space-800"
            >
              <span aria-live="polite">{formatMonthTitle(month)}</span>
              <Chevron open={pickingMonth} />
            </button>
            <button
              type="button"
              aria-label="Próximo mês"
              tabIndex={pickingMonth ? -1 : undefined}
              onClick={() => setMonth(shiftMonth(month, 1))}
              className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-space-800 ${pickingMonth ? "invisible" : ""}`}
            >
              ›
            </button>
          </div>

          {pickingMonth ? (
            <div className="mt-2">
              <MonthYearGrid
                month={month}
                onSelect={(m) => {
                  setMonth(m);
                  setPickingMonth(false);
                }}
              />
            </div>
          ) : (
            <>
          <div
            className="mt-2 grid grid-cols-7 text-center text-caption text-ink-300"
            aria-hidden="true"
          >
            {WEEKDAYS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday(month) }, (_, i) => (
              <span key={`p${i}`} aria-hidden="true" />
            ))}
            {Array.from({ length: daysInMonth(month) }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, "0")}`;
              const selected = date === value;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => pick(date)}
                  aria-pressed={selected}
                  aria-current={date === today ? "date" : undefined}
                  className={`aspect-square rounded-lg font-mono text-caption transition ${
                    selected
                      ? "bg-ember-400 font-bold text-space-950"
                      : date === today
                        ? "border border-focus-ring text-ink-100 hover:bg-space-800"
                        : "text-ink-100 hover:bg-space-800"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
            </>
          )}

          <button
            type="button"
            onClick={() => pick(today)}
            className="mt-2 w-full rounded-lg border border-space-600 py-1.5 text-caption hover:border-ember-400"
          >
            Ir para hoje
          </button>
        </div>
      )}
    </div>
  );
}
