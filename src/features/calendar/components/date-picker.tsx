"use client";

import { useRef, useState } from "react";
import { fieldClass } from "@/components/ui/field";
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
  /** Nome do campo, lido por leitores de tela (padrão: "Data"). */
  label?: string;
  /** Datas fora do intervalo ficam desativadas. */
  min?: string;
  max?: string;
  /** Onde o calendário abre em relação ao campo. */
  placement?: "bottom" | "top";
  align?: "left" | "right";
};

// Seletor de data próprio (o nativo do navegador destoa do tema escuro).
export function DatePicker({
  id,
  value,
  onChange,
  label = "Data",
  min,
  max,
  placement = "bottom",
  align = "left",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(monthOf(value));
  const [pickingMonth, setPickingMonth] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = todayUtc();

  useDismiss(open, ref, () => setOpen(false));

  const outOfRange = (date: string) =>
    Boolean((min && date < min) || (max && date > max));

  const pick = (date: string) => {
    if (outOfRange(date)) return;
    onChange(date);
    setOpen(false);
  };

  return (
    <div
      ref={ref}
      className="relative min-w-0 flex-1"
      onKeyDown={(e) => {
        // Esc fecha só o calendário (não o modal que o contém).
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          setOpen(false);
        }
      }}
    >
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${formatShort(value)}`}
        onClick={() => {
          setMonth(monthOf(value));
          setPickingMonth(false);
          setOpen((o) => !o);
        }}
        className={`${fieldClass} w-full justify-between text-left ${
          open ? "border-ember-400 ring-4 ring-ember-400/20" : ""
        }`}
      >
        <span className="truncate font-mono">{formatShort(value)}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Escolher data"
          className={`pop-in absolute z-40 w-72 rounded-2xl border border-space-600 bg-space-900 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.6)] ${
            placement === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } ${align === "right" ? "right-0" : "left-0"}`}
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
                  disabled={outOfRange(date)}
                  aria-pressed={selected}
                  aria-current={date === today ? "date" : undefined}
                  className={`aspect-square rounded-lg font-mono text-caption transition disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent ${
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
            disabled={outOfRange(today)}
            className="mt-2 w-full rounded-lg border border-space-600 py-1.5 text-caption hover:border-ember-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Ir para hoje
          </button>
        </div>
      )}
    </div>
  );
}
