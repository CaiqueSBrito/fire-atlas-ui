"use client";

import { ErrorState } from "@/components/feedback/error-state";
import { fieldClass, fieldLabelClass } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { REGIONS, getRegion } from "@/config/regions";
import { hasApi } from "@/lib/api/client";
import { formatLong, shiftDate, todayUtc } from "@/lib/utils/dates";
import type { ImageryKind, PassTime } from "@/types/calendar";
import type { Bbox } from "@/types/detections";
import { useDayQuery } from "../hooks/use-calendar-queries";
import { ActivityCard, PASS_TIME_LABEL } from "./activity-card";
import { DatePicker } from "./date-picker";
import { STATUS_META } from "./day-tile";
import type { DayMapLayers } from "./day-live-map";
import { DayMap } from "./day-map";

const REGION_OPTIONS = REGIONS.map((r) => ({ value: r.id, label: r.label }));
const TIME_OPTIONS = (
  hasApi ? (["all"] as PassTime[]) : (Object.keys(PASS_TIME_LABEL) as PassTime[])
).map((t) => ({
  value: t,
  label: PASS_TIME_LABEL[t],
}));

type DetailViewProps = {
  date: string;
  regionId: string;
  passTime: PassTime;
  view: ImageryKind | null;
  viewBbox?: Bbox | null;
  layers?: DayMapLayers;
  onChange: (
    patch: Partial<{
      date: string | null;
      region: string;
      time: PassTime;
      view: ImageryKind | null;
    }>,
  ) => void;
};

export function DetailView({
  date,
  regionId,
  passTime,
  view,
  viewBbox = null,
  layers,
  onChange,
}: DetailViewProps) {
  const region = getRegion(regionId);
  const time: PassTime = hasApi ? "all" : passTime;
  const query = useDayQuery(date, region.id, time);
  const data = query.data;
  const isStale = !!data && (data.date !== date || data.region !== region.id || data.passTime !== time);

  // Alternância térmica/geográfica só quando há imagem correspondente (RN07).
  const available = new Set(data?.imagery.map((i) => i.kind));
  const activeView = view && available.has(view) ? view : null;

  return (
    <div className="p-5 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-caption uppercase tracking-widest text-ink-300">
            Carta do dia
          </p>
          <h2 className="font-display text-h1 font-bold leading-tight" aria-live="polite">
            {formatLong(date)}
          </h2>
          {data && !isStale && (
            <p className="mt-1 inline-flex items-center gap-2 rounded-full border border-space-600 bg-space-900/80 px-3 py-1 text-small">
              <span className="font-mono text-ember-400">
                {STATUS_META[data.status].glyph}
              </span>
              {STATUS_META[data.status].label}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChange({ date: null })}
          className="rounded-lg border border-space-600 px-3 py-2 text-small hover:border-ember-400"
        >
          Fechar carta
        </button>
      </div>

      {/* RN06: alterar data, região e horário sem voltar ao calendário */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Select
          label="Local"
          value={region.id}
          options={REGION_OPTIONS}
          onChange={(id) => onChange({ region: id })}
        />
        <div>
          <label
            htmlFor="detail-date"
            className={fieldLabelClass}
          >
            Data
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Dia anterior"
              onClick={() => onChange({ date: shiftDate(date, -1) })}
              className={`${fieldClass} w-12 shrink-0 justify-center px-0 text-lg hover:text-ember-400`}
            >
              ‹
            </button>
            <DatePicker
              id="detail-date"
              value={date}
              onChange={(d) => onChange({ date: d })}
            />
            <button
              type="button"
              aria-label="Próximo dia"
              disabled={date >= todayUtc()}
              onClick={() => onChange({ date: shiftDate(date, 1) })}
              className={`${fieldClass} w-12 shrink-0 justify-center px-0 text-lg hover:text-ember-400`}
            >
              ›
            </button>
          </div>
        </div>
        <div>
          <Select
            label="Horário"
            value={time}
            options={TIME_OPTIONS}
            onChange={(t) => onChange({ time: t })}
          />
          {hasApi && (
            <p className="mt-1 text-caption text-ink-300">
              A fonte não separa passagem diurna e noturna.
            </p>
          )}
        </div>
      </div>

      <div
        className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]"
        aria-busy={query.isFetching}
      >
        <div
          className={`transition-opacity ${isStale ? "opacity-60" : ""}`}
        >
          {query.isError && !data ? (
            <ErrorState
              message={
                query.error instanceof Error
                  ? query.error.message
                  : "Falha ao carregar a carta."
              }
              onRetry={() => query.refetch()}
            />
          ) : !data ? (
            <div
              role="status"
              className="aspect-[5/7] max-w-sm animate-pulse rounded-2xl bg-space-800"
            >
              <span className="sr-only">Carregando a carta…</span>
            </div>
          ) : (
            <>
              <ActivityCard data={data} region={region} view={activeView} />
              {query.isError && (
                <div className="mt-3">
                  <ErrorState
                    title="Não foi possível atualizar a carta"
                    onRetry={() => query.refetch()}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <section
          aria-label="Mapa de focos"
          className="rounded-2xl border border-space-600 bg-space-900/80 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur"
        >
          <h3 className="font-display text-lg font-bold">Mapa de focos</h3>
          <div className="mt-3 aspect-[3/2] max-h-[30rem] w-full overflow-hidden rounded-xl border border-space-600">
            {data && data.status !== "unavailable" ? (
              <DayMap
                region={region}
                detections={data.detections}
                grid={data.grid}
                date={date}
                viewBbox={viewBbox}
                layers={layers}
                title={
                  data.grid
                    ? `Mapa esquemático com ${data.grid.cells.length} células H3 com focos em ${region.label}`
                    : `Mapa esquemático com ${data.detections.length} detecções em ${region.label}`
                }
              />
            ) : (
              <div className="grid h-full place-items-center p-4 text-center text-small text-ink-300">
                {data
                  ? (data.note ?? "Dados indisponíveis para esta data.")
                  : "Carregando…"}
              </div>
            )}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-300">
            <li><span aria-hidden="true" className="text-fire-400">●</span> VIIRS</li>
            <li><span aria-hidden="true" className="text-ember-400">◆</span> MODIS</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
