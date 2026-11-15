"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DatePicker } from "@/features/calendar/components/date-picker";
import { fieldClass, fieldLabelClass } from "@/components/ui/field";
import { REGIONS } from "@/config/regions";
import { useResolvedFilters } from "@/hooks/use-filters";
import {
  detectPreset,
  PERIOD_PRESETS,
  presetPeriod,
  type Period,
} from "@/lib/filter-presets";
import { DEFAULT_PERIOD_DAYS } from "@/lib/filters";
import { SENSOR_META, SENSORS } from "@/lib/sensors";
import { formatBboxParam, parseBbox, validateBbox } from "@/lib/utils/bbox";
import { shiftDate, todayUtc } from "@/lib/utils/dates";
import { useDrawMode } from "@/providers/draw-mode";
import type { SensorId } from "@/types/detections";
import { AreaFields } from "./area-fields";

const MAX_DAYS = 366;
const CONTINENTS = ["north-america", "south-america", "europe", "africa", "asia", "oceania"];

type Draft = {
  sensors: SensorId[];
  region: string;
  bbox: string | null;
  period: Period;
};

const chip =
  "inline-flex items-center gap-2 rounded-full border px-4 text-small font-semibold leading-6 tracking-[-0.02em] transition-colors duration-200";

const sectionTitle = "mb-3 text-caption font-semibold uppercase tracking-[0.2em] text-ember-400";

const selectedClass = "border-ember-400 bg-ember-400/15 text-ink-100 shadow-[0_0_16px_rgba(255,176,46,0.15)]";
const idleClass = "border-space-600 bg-space-950/40 text-ink-100 hover:border-ember-400/60";

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5) + 1;
}

function problemOf(draft: Draft, today: string): string | null {
  if (draft.bbox) {
    const box = parseBbox(draft.bbox);
    const problem = box ? validateBbox(box) : "Área inválida.";
    if (problem) return problem;
  }
  const from = draft.period.from ?? shiftDate(today, -(DEFAULT_PERIOD_DAYS - 1));
  const to = draft.period.to ?? today;
  if (from > to) return "A data inicial é posterior à final.";
  if (daysBetween(from, to) > MAX_DAYS) return `O período máximo é de ${MAX_DAYS} dias.`;
  return null;
}

export function FilterModal({
  open,
  onClose,
  canDraw,
}: {
  open: boolean;
  onClose: () => void;
  canDraw: boolean;
}) {
  if (!open) return null;
  return <FilterDialog onClose={onClose} canDraw={canDraw} />;
}

function FilterDialog({ onClose, canDraw }: { onClose: () => void; canDraw: boolean }) {
  const { raw, filters, setRaw } = useResolvedFilters();
  const { setDrawing } = useDrawMode();
  const today = useMemo(() => todayUtc(), []);
  const [search, setSearch] = useState("");
  const [showCoords, setShowCoords] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => {
    const isDefaultPeriod = !raw.from && !raw.to && !raw.date;
    return {
      sensors: filters.sensors,
      region: filters.regionId,
      bbox: filters.customArea ? formatBboxParam(filters.bbox) : null,
      period: isDefaultPeriod ? { from: null, to: null } : { from: filters.from, to: filters.to },
    };
  });

  const preset = detectPreset(draft.period, today);
  const effectiveFrom = draft.period.from ?? shiftDate(today, -(DEFAULT_PERIOD_DAYS - 1));
  const effectiveTo = draft.period.to ?? today;
  const problem = problemOf(draft, today);

  const query = search.trim().toLowerCase();
  const visible = REGIONS.filter((r) => !query || r.label.toLowerCase().includes(query));
  const groups = [
    {
      title: "Mundo e continentes",
      items: visible.filter((r) => r.id === "world" || CONTINENTS.includes(r.id)),
    },
    {
      title: "Brasil e estados",
      items: visible.filter((r) => r.id !== "world" && !CONTINENTS.includes(r.id)),
    },
  ].filter((g) => g.items.length > 0);

  function commit() {
    void setRaw({
      sensors: draft.sensors,
      region: draft.bbox || draft.region === "world" ? null : draft.region,
      bbox: draft.bbox,
      from: draft.period.from,
      to: draft.period.to,
      date: null,
    });
  }

  function apply() {
    if (problem) return;
    commit();
    onClose();
  }

  function reset() {
    setDraft({ sensors: [...SENSORS], region: "world", bbox: null, period: { from: null, to: null } });
    setSearch("");
  }

  function startDrawing() {
    if (problem) return;
    commit();
    setDrawing(true);
    onClose();
  }

  function toggleSensor(id: SensorId) {
    setDraft((d) => ({
      ...d,
      sensors: d.sensors.includes(id)
        ? d.sensors.filter((s) => s !== id)
        : SENSORS.filter((s) => s === id || d.sensors.includes(s)),
    }));
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Filtros"
      footer={
        <>
          <Button variant="secondary" onClick={reset}>
            Limpar
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="accent"
              onClick={apply}
              disabled={Boolean(problem)}
            >
              Aplicar
            </Button>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-6 text-base">
        <section aria-labelledby="f-sensores">
          <h3 id="f-sensores" className={sectionTitle}>
            Sensores
          </h3>
          <div className="flex flex-wrap gap-2">
            {SENSORS.map((id) => (
              <label key={id} className="cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.sensors.includes(id)}
                  onChange={() => toggleSensor(id)}
                  className="peer sr-only"
                />
                <span
                  className={`${chip} h-12 border-space-600 bg-space-950/40 text-ink-100 peer-checked:border-ember-400 peer-checked:bg-ember-400/15 peer-checked:text-ink-100 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--focus-ring)`}
                >
                  <span aria-hidden style={{ color: SENSOR_META[id].hex }}>
                    {SENSOR_META[id].symbol}
                  </span>
                  {SENSOR_META[id].label}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section aria-labelledby="f-local">
          <h3 id="f-local" className={sectionTitle}>
            Local
          </h3>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar região"
            aria-label="Buscar região"
            className={`${fieldClass} mb-3 w-full`}
          />
          <div
            role="radiogroup"
            aria-label="Região"
            className="flex max-h-56 flex-col gap-3 overflow-y-auto pr-1"
          >
            {groups.map((g) => (
              <div key={g.title}>
                <p className="mb-2 text-caption uppercase tracking-wider text-ink-300">{g.title}</p>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((r) => {
                    const selected = !draft.bbox && draft.region === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setDraft((d) => ({ ...d, region: r.id, bbox: null }))}
                        className={`${chip} h-12 ${selected ? selectedClass : idleClass}`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {groups.length === 0 && (
              <p className="text-small text-ink-300">Nenhuma região encontrada.</p>
            )}
          </div>
        </section>

        <section aria-labelledby="f-area">
          <h3 id="f-area" className={sectionTitle}>
            Área personalizada
          </h3>
          {draft.bbox && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-ember-400/50 bg-ember-400/10 px-4 py-3">
              <p className="min-w-0 truncate font-mono text-small text-ink-100">{draft.bbox}</p>
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, bbox: null }))}
                className="shrink-0 text-small font-semibold text-ember-400 underline-offset-4 hover:underline"
              >
                Remover
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {canDraw ? (
              <Button variant="secondary" onClick={startDrawing} disabled={Boolean(problem)}>
                Desenhar no mapa
              </Button>
            ) : null}
            <Button
              variant="secondary"
              aria-expanded={showCoords}
              onClick={() => setShowCoords((v) => !v)}
            >
              Digitar coordenadas
              <span aria-hidden className={`text-caption transition-transform ${showCoords ? "rotate-180" : ""}`}>
                ▾
              </span>
            </Button>
          </div>
          {!canDraw && (
            <p className="mt-2 text-caption text-ink-300">
              Para desenhar a área, abra a página do Mapa.
            </p>
          )}
          {showCoords && (
            <div className="mt-3 rounded-xl border border-space-600 bg-space-950/50 p-4">
              <AreaFields
                bbox={draft.bbox}
                fallback={filters.bbox}
                onChange={(bbox) => {
                  setDraft((d) => ({ ...d, bbox }));
                  if (bbox) setShowCoords(false);
                }}
              />
            </div>
          )}
        </section>

        <section aria-labelledby="f-periodo">
          <h3 id="f-periodo" className={sectionTitle}>
            Período
          </h3>
          <div className="flex flex-wrap gap-2">
            {PERIOD_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={preset === p.id}
                onClick={() => setDraft((d) => ({ ...d, period: presetPeriod(p.id, today) }))}
                className={`${chip} h-12 ${preset === p.id ? selectedClass : idleClass}`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={preset === "custom"}
              onClick={() =>
                setDraft((d) => ({ ...d, period: { from: effectiveFrom, to: effectiveTo } }))
              }
              className={`${chip} h-12 ${preset === "custom" ? selectedClass : idleClass}`}
            >
              Personalizado
            </button>
          </div>
          {preset === "custom" && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <span id="f-de" className={fieldLabelClass}>De</span>
                <DatePicker
                  id="f-de-btn"
                  label="De"
                  value={effectiveFrom}
                  max={effectiveTo}
                  placement="top"
                  onChange={(d) =>
                    setDraft((x) => ({ ...x, period: { from: d, to: effectiveTo } }))
                  }
                />
              </div>
              <div>
                <span id="f-ate" className={fieldLabelClass}>Até</span>
                <DatePicker
                  id="f-ate-btn"
                  label="Até"
                  value={effectiveTo}
                  min={effectiveFrom}
                  max={today}
                  placement="top"
                  align="right"
                  onChange={(d) =>
                    setDraft((x) => ({ ...x, period: { from: effectiveFrom, to: d } }))
                  }
                />
              </div>
            </div>
          )}
        </section>

        {problem && (
          <p role="alert" className="text-small text-fire-400">
            {problem}
          </p>
        )}
      </div>
    </Dialog>
  );
}
