"use client";

import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { useDetections, useForecast } from "@/hooks/use-detections";
import { ApiError } from "@/lib/api/client";
import { FireMap } from "@/features/map/components/fire-map-loader";
import { MapLegend } from "@/features/map/components/map-legend";
import { Unavailable } from "@/features/stats/components/unavailable";
import type { ForecastResponse } from "@/types/forecast";

const fmtDate = (d: string) => d.split("-").reverse().join("/");
type Available = Extract<ForecastResponse, { status: "available" }>;

function PredictedBanner() {
  return (
    <p
      role="note"
      className="rounded-xl border-2 border-dashed border-[#c4a1ff] bg-[#c4a1ff]/10 p-3 text-small"
    >
      <strong>PREVISÃO — não são detecções observadas.</strong> Estimativas de um
      modelo preditivo, sujeitas às limitações listadas abaixo.
    </p>
  );
}

export function ForecastView() {
  const { data, error, isPending, refetch, filters } = useForecast();
  let body: React.ReactNode;

  if (isPending) {
    body = <LoadingState label="Consultando previsões…" />;
  } else if (error) {
    body = (
      <ErrorState
        message={error.message}
        onRetry={error instanceof ApiError && !error.recoverable ? undefined : () => void refetch()}
      />
    );
  } else if (data?.status === "unavailable") {
    body = (
      <div className="flex flex-col gap-3">
        <Unavailable>
          {data.reason} Nenhuma estimativa é exibida enquanto não houver modelo
          validado e dados fornecidos pelo serviço.
        </Unavailable>
      </div>
    );
  } else if (data) {
    body = <Available data={data} />;
  }

  return (
    <PageSection
      title="Previsões"
      description={`Funcionalidade complementar. Região selecionada: ${filters.regionId}.`}
    >
      {body}
    </PageSection>
  );
}

function Available({ data }: { data: Available }) {
  const { data: observed } = useDetections();
  const items = observed?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PredictedBanner />

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-small">
        <dt className="text-ink-300">Modelo</dt>
        <dd>{data.model.name}{data.model.version ? ` v${data.model.version}` : ""}</dd>
        <dt className="text-ink-300">Região</dt>
        <dd>{data.region}</dd>
        <dt className="text-ink-300">Horizonte previsto</dt>
        <dd className="font-mono">{fmtDate(data.horizon.from)} → {fmtDate(data.horizon.to)}</dd>
        {data.generatedAt && (
          <>
            <dt className="text-ink-300">Gerada em</dt>
            <dd className="font-mono">{data.generatedAt}</dd>
          </>
        )}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="relative min-h-[50svh] overflow-hidden rounded-2xl border border-space-600">
          <FireMap
            detections={items}
            view={data.areas[0]?.bbox ?? [-180, -60, 180, 80]}
            aoi={null}
            drawing={false}
            selectedId={null}
            onSelect={() => {}}
            showMatches={false}
            forecastAreas={data.areas}
            label="Mapa comparando detecções observadas (pontos) e áreas previstas (retângulos tracejados)."
          />
        </div>
        <div className="flex flex-col gap-4">
          <MapLegend enabled={filters_sensors(items)} showForecast />
          <p className="text-caption text-ink-300">
            Pontos ◆ ● = detecções <strong>observadas</strong>. Retângulos
            tracejados = áreas <strong>previstas</strong>.
          </p>
        </div>
      </div>

      <section aria-labelledby="areas-title">
        <h2 id="areas-title" className="font-display text-lg font-bold">Áreas previstas</h2>
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {data.areas.map((a) => (
            <li key={a.id} className="rounded-2xl border border-dashed border-[#c4a1ff] bg-space-800 p-4 text-small">
              <p className="font-display text-base font-bold">
                {a.label} <span className="font-normal text-[#c4a1ff]">· previsto</span>
              </p>
              <p className="font-mono text-ink-300">
                O {a.bbox[0]}° S {a.bbox[1]}° L {a.bbox[2]}° N {a.bbox[3]}°
              </p>
              {a.frpPredicted && (
                <p>FRP previsto: <span className="font-mono">{a.frpPredicted.value.toLocaleString("pt-BR")} {a.frpPredicted.unit}</span></p>
              )}
              {a.confidence && (
                <p>{a.confidence.metric}: <span className="font-mono">{a.confidence.value.toLocaleString("pt-BR")}</span></p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="limits-title" className="rounded-2xl border border-space-600 bg-space-900 p-5">
        <h2 id="limits-title" className="font-display text-lg font-bold">Limitações do modelo</h2>
        {data.limitations.length ? (
          <ul className="mt-2 list-disc pl-5 text-small text-ink-300">
            {data.limitations.map((l) => <li key={l}>{l}</li>)}
          </ul>
        ) : (
          <p className="mt-2 text-small text-ink-300">
            O serviço não informou as limitações documentadas do modelo. Trate
            estas previsões com cautela.
          </p>
        )}
      </section>
    </div>
  );
}

const filters_sensors = (items: { sensor: "modis" | "viirs" }[]) =>
  (["modis", "viirs"] as const).filter((s) => items.some((i) => i.sensor === s));
