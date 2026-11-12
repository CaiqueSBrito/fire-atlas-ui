"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import {
  MIN_YEAR,
  maxYear,
  monthShortName,
  todayUtc,
} from "@/lib/utils/dates";

type MonthYearGridProps = {
  /** Mês atual "YYYY-MM" */
  month: string;
  onSelect: (month: string) => void;
};

// Escolha rápida de mês e ano: setas de ano + grade com os 12 meses.
export function MonthYearGrid({ month, onSelect }: MonthYearGridProps) {
  const [year, setYear] = useState(Number(month.slice(0, 4)));
  const currentMonth = todayUtc().slice(0, 7);
  const top = maxYear();
  const yearOptions = Array.from({ length: top - MIN_YEAR + 1 }, (_, i) => {
    const y = top - i;
    return { value: y, label: String(y) };
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Ano anterior"
          disabled={year <= MIN_YEAR}
          onClick={() => setYear((y) => y - 1)}
          className="grid h-8 w-8 place-items-center rounded-lg hover:bg-space-800 disabled:opacity-30"
        >
          ‹
        </button>
        <Select
          label="Ano"
          hideLabel
          value={year}
          options={yearOptions}
          onChange={setYear}
          className="w-32"
          buttonClassName="!rounded-lg !bg-space-800 !px-2 !py-1 font-display font-bold"
          listClassName="max-h-52"
        />
        <button
          type="button"
          aria-label="Próximo ano"
          disabled={year >= top}
          onClick={() => setYear((y) => y + 1)}
          className="grid h-8 w-8 place-items-center rounded-lg hover:bg-space-800 disabled:opacity-30"
        >
          ›
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {Array.from({ length: 12 }, (_, i) => {
          const value = `${year}-${String(i + 1).padStart(2, "0")}`;
          const selected = value === month;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              aria-current={value === currentMonth ? "date" : undefined}
              onClick={() => onSelect(value)}
              className={`rounded-lg py-2 text-small capitalize transition ${
                selected
                  ? "bg-ember-400 font-bold text-space-950"
                  : value === currentMonth
                    ? "border border-focus-ring hover:bg-space-800"
                    : "hover:bg-space-800"
              }`}
            >
              {monthShortName(i)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
