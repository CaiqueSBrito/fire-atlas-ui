"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getRegion } from "@/config/regions";
import { useResolvedFilters } from "@/hooks/use-filters";
import { formatPeriod } from "@/lib/filter-presets";
import { isDirty } from "@/lib/filters";
import { SENSOR_META, SENSORS } from "@/lib/sensors";
import { FilterModal } from "./filter-modal";

const pill =
  "inline-flex h-12 items-center gap-2 rounded-full border border-space-600 px-4 text-base font-semibold leading-6 tracking-[-0.02em] text-ink-100";

function Summary({
  label,
  active,
  removeLabel,
  onRemove,
}: {
  label: React.ReactNode;
  active: boolean;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <li
      className={`${pill} ${active ? "border-ember-400/60 bg-space-800" : "text-ink-300"}`}
    >
      <span>{label}</span>
      {active && (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="-mr-2 grid h-8 w-8 place-items-center rounded-full text-ink-300 transition-colors duration-200 hover:bg-space-600 hover:text-ink-100"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </li>
  );
}

export function FilterBar({ canDraw = false }: { canDraw?: boolean }) {
  const { raw, setRaw, filters } = useResolvedFilters();
  const [open, setOpen] = useState(false);

  const sensorsActive = filters.sensors.length !== SENSORS.length;
  const placeActive = filters.customArea || filters.regionId !== "world";
  const periodActive = Boolean(raw.from || raw.to || raw.date);
  const count = [sensorsActive, placeActive, periodActive].filter(Boolean).length;

  const sensorsLabel =
    filters.sensors.length === 0 ? (
      "Nenhum sensor"
    ) : (
      <span className="inline-flex items-center gap-2">
        {filters.sensors.map((id) => (
          <span key={id} className="inline-flex items-center gap-1">
            <span aria-hidden style={{ color: SENSOR_META[id].hex }}>
              {SENSOR_META[id].symbol}
            </span>
            {SENSOR_META[id].label}
          </span>
        ))}
      </span>
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-ember-400 bg-space-900 px-4 text-base font-semibold leading-6 tracking-[-0.02em] text-ink-100 transition-colors duration-200 hover:bg-space-800"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 text-ember-400" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="8" cy="17" r="2" />
        </svg>
        {count > 0 ? `Filtros (${count})` : "Filtros"}
      </button>

      <ul aria-label="Filtros em uso" className="flex flex-wrap items-center gap-2">
        <Summary
          label={sensorsLabel}
          active={sensorsActive}
          removeLabel="Remover filtro de sensores"
          onRemove={() => void setRaw({ sensors: null })}
        />
        <Summary
          label={filters.customArea ? "Área personalizada" : getRegion(filters.regionId).label}
          active={placeActive}
          removeLabel="Remover filtro de local"
          onRemove={() => void setRaw({ region: null, bbox: null })}
        />
        <Summary
          label={formatPeriod(filters.from, filters.to)}
          active={periodActive}
          removeLabel="Remover filtro de período"
          onRemove={() => void setRaw({ from: null, to: null, date: null })}
        />
      </ul>

      {(isDirty(raw) || raw.date) && (
        <Button
          variant="ghost"
          onClick={() =>
            void setRaw({
              sensors: null,
              from: null,
              to: null,
              region: null,
              bbox: null,
              date: null,
            })
          }
        >
          Limpar filtros
        </Button>
      )}

      {filters.problem && (
        <p role="alert" className="w-full text-small text-fire-400">
          {filters.problem}
        </p>
      )}

      <FilterModal open={open} onClose={() => setOpen(false)} canDraw={canDraw} />
    </div>
  );
}
