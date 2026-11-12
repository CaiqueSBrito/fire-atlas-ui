"use client";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { REGIONS } from "@/config/regions";
import { useResolvedFilters } from "@/hooks/use-filters";
import { isDirty } from "@/lib/filters";
import { SENSOR_META, SENSORS } from "@/lib/sensors";
import type { SensorId } from "@/types/detections";

const dateInput =
  "min-h-11 rounded-lg border border-space-600 bg-space-800 px-3 text-small text-ink-100 [color-scheme:dark]";

const CUSTOM = "custom";

export function FilterBar() {
  const { raw, setRaw, filters } = useResolvedFilters();

  function toggleSensor(id: SensorId) {
    const next = filters.sensors.includes(id)
      ? filters.sensors.filter((s) => s !== id)
      : SENSORS.filter((s) => s === id || filters.sensors.includes(s));
    void setRaw({ sensors: next });
  }

  const regionOptions = [
    ...(filters.customArea ? [{ value: CUSTOM, label: "Área personalizada" }] : []),
    ...REGIONS.map((r) => ({ value: r.id, label: r.label })),
  ];

  return (
    <form
      aria-label="Filtros da análise"
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-wrap items-end gap-x-6 gap-y-3"
    >
      <fieldset>
        <legend className="mb-1 text-caption uppercase tracking-wider text-ink-300">
          Sensores
        </legend>
        <div className="flex gap-1">
          {SENSORS.map((id) => (
            <label key={id} className="cursor-pointer">
              <input
                type="checkbox"
                checked={filters.sensors.includes(id)}
                onChange={() => toggleSensor(id)}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-space-600 px-4 text-small font-semibold text-ink-300 peer-checked:border-ink-300 peer-checked:bg-space-800 peer-checked:text-ink-100 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--focus-ring)">
                <span aria-hidden style={{ color: SENSOR_META[id].hex }}>
                  {SENSOR_META[id].symbol}
                </span>
                {SENSOR_META[id].label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Select
        label="Região"
        value={filters.customArea ? CUSTOM : filters.regionId}
        options={regionOptions}
        onChange={(id) =>
          void setRaw({
            region: id === "world" || id === CUSTOM ? null : id,
            bbox: id === CUSTOM ? raw.bbox : null,
          })
        }
        className="w-48"
      />

      <label className="flex flex-col gap-1 text-caption uppercase tracking-wider text-ink-300">
        De
        <input
          type="date"
          value={filters.from}
          max={filters.to}
          onChange={(e) => void setRaw({ from: e.target.value || null })}
          className={dateInput}
        />
      </label>
      <label className="flex flex-col gap-1 text-caption uppercase tracking-wider text-ink-300">
        Até
        <input
          type="date"
          value={filters.to}
          min={filters.from}
          onChange={(e) => void setRaw({ to: e.target.value || null })}
          className={dateInput}
        />
      </label>

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
    </form>
  );
}
