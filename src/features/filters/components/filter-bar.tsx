"use client";

import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useFilters } from "@/hooks/use-filters";
import { SATELLITE_OPTIONS } from "@/lib/filters";

const dateInput =
  "min-h-11 rounded-lg border border-space-600 bg-space-800 px-3 text-small text-ink-100 [color-scheme:dark]";

export function FilterBar({ children }: { children?: ReactNode }) {
  const [filters, setFilters] = useFilters();
  const name = useId();
  const dirty =
    filters.satellite !== "all" || filters.from !== null || filters.to !== null;

  return (
    <form
      aria-label="Filtros da análise"
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-wrap items-end gap-x-6 gap-y-3"
    >
      <fieldset>
        <legend className="mb-1 text-caption uppercase tracking-wider text-ink-300">
          Satélite
        </legend>
        <div className="flex flex-wrap gap-1">
          {SATELLITE_OPTIONS.map((opt) => (
            <label key={opt.value} className="cursor-pointer">
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={filters.satellite === opt.value}
                onChange={() => setFilters({ satellite: opt.value })}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-11 items-center rounded-full border border-space-600 px-4 text-small font-semibold text-ink-300 peer-checked:border-ember-400 peer-checked:bg-ember-400 peer-checked:text-space-950 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--focus-ring)">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-caption uppercase tracking-wider text-ink-300">
        De
        <input
          type="date"
          value={filters.from ?? ""}
          max={filters.to ?? undefined}
          onChange={(e) => setFilters({ from: e.target.value || null })}
          className={dateInput}
        />
      </label>
      <label className="flex flex-col gap-1 text-caption uppercase tracking-wider text-ink-300">
        Até
        <input
          type="date"
          value={filters.to ?? ""}
          min={filters.from ?? undefined}
          onChange={(e) => setFilters({ to: e.target.value || null })}
          className={dateInput}
        />
      </label>

      {children}

      {dirty && (
        <Button
          variant="ghost"
          onClick={() => setFilters({ satellite: null, from: null, to: null })}
        >
          Limpar filtros
        </Button>
      )}
    </form>
  );
}
