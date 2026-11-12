"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useFilters } from "@/hooks/use-filters";
import { cn } from "@/lib/utils/cn";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_FMT = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});
const DAY_FMT = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" });

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const formatIso = (iso: string) => iso.split("-").reverse().join("/");

/** Calendário retrátil: escolher um dia ou um intervalo atualiza os filtros. */
export function CalendarPanel() {
  const [filters, setFilters] = useFilters();
  const [view, setView] = useState(() => {
    const ref = filters.from ? new Date(`${filters.from}T00:00:00`) : new Date();
    return { year: ref.getFullYear(), month: ref.getMonth() };
  });

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shiftMonth(delta: number) {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  }

  // 1º clique define o início; 2º define o fim (ou reinicia se for anterior).
  function pick(iso: string) {
    if (!filters.from || filters.to) {
      setFilters({ from: iso, to: null });
    } else if (iso < filters.from) {
      setFilters({ from: iso, to: null });
    } else {
      setFilters({ to: iso });
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm p-4">
      <div className="mb-3 flex items-center justify-between">
        <Button variant="secondary" onClick={() => shiftMonth(-1)}>
          <span aria-hidden>‹</span>
          <span className="sr-only">Mês anterior</span>
        </Button>
        <h2 aria-live="polite" className="font-display font-bold capitalize">
          {MONTH_FMT.format(new Date(view.year, view.month, 1))}
        </h2>
        <Button variant="secondary" onClick={() => shiftMonth(1)}>
          <span aria-hidden>›</span>
          <span className="sr-only">Próximo mês</span>
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-caption text-ink-300">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`blank-${i}`} />;
          const iso = toIso(view.year, view.month, day);
          const isEdge = iso === filters.from || iso === filters.to;
          const inRange =
            filters.from !== null &&
            filters.to !== null &&
            iso > filters.from &&
            iso < filters.to;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => pick(iso)}
              aria-pressed={isEdge || inRange}
              aria-label={DAY_FMT.format(new Date(view.year, view.month, day))}
              className={cn(
                "min-h-11 rounded-lg font-mono text-small",
                isEdge
                  ? "bg-ember-400 font-bold text-space-950"
                  : inRange
                    ? "bg-space-600 text-ink-100"
                    : "text-ink-100 hover:bg-space-800",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-small text-ink-300" aria-live="polite">
        {filters.from
          ? `Período: ${formatIso(filters.from)} – ${filters.to ? formatIso(filters.to) : "escolha o fim"}`
          : "Escolha uma data inicial."}
      </p>
    </div>
  );
}
