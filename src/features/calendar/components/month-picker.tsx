"use client";

import { useRef, useState, type ReactNode } from "react";
import { Chevron } from "@/components/ui/select";
import { useDismiss } from "@/hooks/use-dismiss";
import { cn } from "@/lib/utils/cn";
import {
  MIN_YEAR,
  daysInMonth,
  firstWeekday,
  formatLong,
  formatMonthTitle,
  monthOf,
  shiftDate,
  shiftMonth,
  todayUtc,
} from "@/lib/utils/dates";

const WEEKDAYS = [
  ["Sun", "Sunday"],
  ["Mon", "Monday"],
  ["Tue", "Tuesday"],
  ["Wed", "Wednesday"],
  ["Thu", "Thursday"],
  ["Fri", "Friday"],
  ["Sat", "Saturday"],
] as const;

const FIRST_MONTH = `${MIN_YEAR}-01`;

const navButton =
  "absolute top-0 grid h-7 w-7 place-items-center rounded-lg border border-space-600 text-ink-300 transition hover:border-ember-400 hover:text-ember-400 disabled:pointer-events-none disabled:opacity-30";

type MonthPickerProps = {
  month: string;
  date: string | null;
  onSelectDate: (date: string) => void;
  /** Substitui o titulo do mes, mantendo o mesmo calendario. */
  trigger?: { content: ReactNode; ariaLabel: string; className: string };
};

function monthDays(month: string): Array<{ date: string; outside: boolean }> {
  const first = `${month}-01`;
  const start = shiftDate(first, -firstWeekday(month));
  const weeks = Math.ceil((firstWeekday(month) + daysInMonth(month)) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const date = shiftDate(start, i);
    return { date, outside: monthOf(date) !== month };
  });
}

function MonthGrid({
  month,
  draft,
  today,
  yearOpen,
  onTitle,
  onPick,
}: {
  month: string;
  draft: string | null;
  today: string;
  yearOpen: boolean;
  onTitle: () => void;
  onPick: (date: string) => void;
}) {
  const titleId = `day-picker-${month}`;
  const days = monthDays(month);
  const weeks = Array.from({ length: days.length / 7 }, (_, w) => days.slice(w * 7, w * 7 + 7));

  return (
    <div className="flex flex-col gap-3">
      <button
        id={titleId}
        type="button"
        aria-live="polite"
        aria-haspopup="dialog"
        aria-expanded={yearOpen}
        onClick={onTitle}
        title="Choose year"
        className="mx-auto rounded-lg px-2 py-0.5 text-center text-small font-semibold capitalize transition hover:bg-space-800 hover:text-ember-400"
      >
        {formatMonthTitle(month)}
      </button>
      <table role="grid" aria-labelledby={titleId} className="border-collapse">
        <thead>
          <tr className="flex">
            {WEEKDAYS.map(([short, long]) => (
              <th key={short} scope="col" aria-label={long} className="w-9 text-caption font-normal text-ink-300">
                {short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].date} className="mt-1.5 flex">
              {week.map(({ date, outside }) => {
                const selected = date === draft;
                const isToday = date === today;
                const future = date > today;
                return (
                  <td key={date} className="h-9 w-9 p-0 text-center">
                    <button
                      type="button"
                      onClick={() => onPick(date)}
                      disabled={future}
                      aria-pressed={selected}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={`${formatLong(date)}${isToday ? " (today)" : ""}`}
                      className={cn(
                        "h-9 w-9 rounded-xl text-small transition focus-visible:outline-2 focus-visible:outline-offset-1",
                        selected
                          ? "bg-ember-400 font-bold text-space-950"
                          : isToday
                            ? "border border-ember-400 text-ember-400 hover:bg-ember-400/10"
                            : "hover:bg-space-800",
                        outside && !selected && "text-ink-300 opacity-50",
                        future && "cursor-not-allowed opacity-30",
                      )}
                    >
                      {Number(date.slice(8, 10))}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MonthPicker({ month, date, onSelectDate, trigger }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(month);
  const ref = useRef<HTMLDivElement>(null);
  const today = todayUtc();
  const [yearOpen, setYearOpen] = useState(false);
  const close = () => {
    setOpen(false);
    setYearOpen(false);
  };
  useDismiss(open, ref, close);

  const toggle = () => {
    if (open) return close();
    setView(month);
    setOpen(true);
  };

  const currentYear = Number(today.slice(0, 4));
  const viewYear = Number(view.slice(0, 4));
  const years = Array.from({ length: currentYear - MIN_YEAR + 1 }, (_, i) => currentYear - i);
  const pickYear = (y: number) => {
    const next = `${y}-${view.slice(5, 7)}`;
    setView(next > monthOf(today) ? monthOf(today) : next);
    setYearOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        title="Choose day"
        aria-label={trigger?.ariaLabel ?? `${formatMonthTitle(month)} — choose day`}
        className={trigger?.className ?? "flex items-center gap-2 rounded-xl px-3 py-2 transition hover:bg-space-800"}
      >
        {trigger ? trigger.content : (
          <span className="whitespace-nowrap font-display text-xl font-bold leading-none" aria-live="polite">
            {formatMonthTitle(month)}
          </span>
        )}
        <Chevron open={open} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose day"
          className="pop-in absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 rounded-2xl border border-space-600 bg-space-900 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.6)]"
        >
          <div className="relative">
            <button
              type="button"
              aria-label="Previous month"
              disabled={view <= FIRST_MONTH}
              onClick={() => setView((v) => shiftMonth(v, -1))}
              className={cn(navButton, "left-0")}
            >
              ‹
            </button>
            <MonthGrid
              month={view}
              draft={date}
              today={today}
              yearOpen={yearOpen}
              onTitle={() => setYearOpen((o) => !o)}
              onPick={(d) => {
                onSelectDate(d);
                close();
              }}
            />
            <button
              type="button"
              aria-label="Next month"
              disabled={view >= monthOf(today)}
              onClick={() => setView((v) => shiftMonth(v, 1))}
              className={cn(navButton, "right-0")}
            >
              ›
            </button>
          </div>

          {yearOpen && (
            <div
              role="dialog"
              aria-label="Choose year"
              onKeyDown={(e) => {
                if (e.key !== "Escape") return;
                e.stopPropagation();
                setYearOpen(false);
              }}
              className="pop-in absolute inset-0 z-10 flex flex-col gap-3 rounded-2xl border border-space-600 bg-space-900 p-4"
            >
              <div className="relative">
                <button
                  type="button"
                  aria-label="Back to days"
                  onClick={() => setYearOpen(false)}
                  className={cn(navButton, "left-0")}
                >
                  ‹
                </button>
                <p className="text-center text-small font-semibold">Choose year</p>
              </div>
              <div className="grid min-h-0 flex-1 grid-cols-3 content-start gap-1.5 overflow-y-auto pr-1">
                {years.map((y) => {
                  const selected = y === viewYear;
                  return (
                    <button
                      key={y}
                      type="button"
                      autoFocus={selected}
                      aria-pressed={selected}
                      onClick={() => pickYear(y)}
                      className={cn(
                        "h-9 rounded-xl text-small transition",
                        selected ? "bg-ember-400 font-bold text-space-950" : "hover:bg-space-800",
                      )}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
