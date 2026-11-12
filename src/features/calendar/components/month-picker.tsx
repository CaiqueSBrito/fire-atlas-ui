"use client";

import { useRef, useState } from "react";
import { Chevron } from "@/components/ui/select";
import { useDismiss } from "@/hooks/use-dismiss";
import { formatMonthTitle } from "@/lib/utils/dates";
import { MonthYearGrid } from "./month-year-grid";

type MonthPickerProps = {
  month: string;
  onChange: (month: string) => void;
};

// Título do mês clicável: abre a escolha rápida de mês/ano.
export function MonthPicker({ month, onChange }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title="Escolher mês e ano"
        aria-label={`${formatMonthTitle(month)} — escolher mês e ano`}
        className="flex items-center gap-2 rounded-xl px-3 py-2 transition hover:bg-space-800"
      >
        <span
          className="font-display text-xl font-bold leading-none"
          aria-live="polite"
        >
          {formatMonthTitle(month)}
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Escolher mês e ano"
          className="pop-in absolute inset-x-0 top-full z-30 mx-auto mt-2 w-72 rounded-2xl border border-space-600 bg-space-900 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.6)]"
        >
          <MonthYearGrid
            month={month}
            onSelect={(m) => {
              onChange(m);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
