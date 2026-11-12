"use client";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { REGIONS } from "@/config/regions";
import { useStats } from "@/hooks/use-detections";
import { ApiError } from "@/lib/api/client";
import { SENSOR_META } from "@/lib/sensors";
import { HistoryComparison } from "./history-comparison";
import { IndicatorCards } from "./indicator-cards";
import { CriticalPeriods, RankingPanel } from "./insight-panels";
import { TimeSeriesChart } from "./time-series-chart";

const fmtDate = (d: string) => d.split("-").reverse().join("/");

export function StatsDashboard() {
  const { data, error, isPending, isFetching, refetch, filters, enabled } = useStats();
  const regionLabel = filters.customArea
    ? "Área personalizada"
    : REGIONS.find((r) => r.id === filters.regionId)?.label ?? filters.regionId;
  const sensorsLabel =
    filters.sensors.map((s) => SENSOR_META[s].label).join(" + ") || "nenhum sensor";

  let body: React.ReactNode;
  if (filters.problem) {
    body = <ErrorState title="Filtro inválido" message={`${filters.problem} Ajuste os filtros para consultar.`} />;
  } else if (filters.sensors.length === 0) {
    body = <EmptyState title="Nenhum sensor selecionado" description="Ative MODIS e/ou VIIRS nos filtros para ver os indicadores." />;
  } else if (enabled && isPending) {
    body = <LoadingState label="Carregando indicadores…" />;
  } else if (error) {
    body = (
      <ErrorState
        message={error.message}
        onRetry={error instanceof ApiError && !error.recoverable ? undefined : () => void refetch()}
      />
    );
  } else if (data) {
    const empty =
      data.series.length === 0 ||
      filters.sensors.every((s) => (data.bySensor[s] ?? 0) === 0);
    body = (
      <div className="flex flex-col gap-6" aria-busy={isFetching}>
        <IndicatorCards stats={data} sensors={filters.sensors} />
        {empty ? (
          <EmptyState
            title="Nenhuma detecção registrada neste recorte"
            description="Isso não significa que não houve fogo: satélites têm limites de cobertura, passagem e nuvens."
          />
        ) : (
          <TimeSeriesChart series={data.series} sensors={filters.sensors} />
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          <HistoryComparison history={data.history} />
          <div className="flex flex-col gap-6">
            <RankingPanel ranking={data.ranking} />
            <CriticalPeriods data={data.criticalPeriods} />
          </div>
        </div>

        <section aria-labelledby="meta-title" className="rounded-2xl border border-space-600 bg-space-900 p-5 text-small text-ink-300">
          <h2 id="meta-title" className="font-display text-base font-bold text-ink-100">
            Metadados
          </h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt>Origem</dt>
            <dd className="text-ink-100">
              {data.source.name}
              {data.source.simulated && " — simulado (protótipo)"}
            </dd>
            <dt>Unidades</dt>
            <dd className="text-ink-100">detecções (contagem); FRP em MW quando informado</dd>
            <dt>Dados originais</dt>
            <dd className="text-ink-100">MODIS ◆ e VIIRS ● — preservados sem alteração</dd>
            <dt>Dados harmonizados</dt>
            <dd className="text-ink-100">▲ azul tracejado — só quando a harmonização validada existir</dd>
          </dl>
        </section>
      </div>
    );
  }

  return (
    <PageSection
      title="Análises"
      description={`Indicadores para ${regionLabel}, de ${fmtDate(filters.from)} a ${fmtDate(filters.to)} · ${sensorsLabel}. Os mesmos filtros do mapa e do calendário.`}
    >
      {body}
    </PageSection>
  );
}
