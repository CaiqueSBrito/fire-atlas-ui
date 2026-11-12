"use client";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { useFireSummary } from "@/hooks/use-fire-summary";
import { ApiError } from "@/lib/api/client";
import type { DataSource } from "@/types/fires";
import { MapLegend, SOURCE_META } from "./map-legend";

/**
 * Visão do mapa. O mapa real (MapLibre) entra depois; por ora exibe o resumo
 * de detecções e exercita todos os estados (RN05): carregando, erro com nova
 * tentativa, vazio e sucesso.
 */
export function MapOverview() {
  const { data, error, isPending, isFetching, refetch } = useFireSummary();

  return (
    <PageSection
      title="Mapa de focos de calor"
      description="Detecções dos satélites MODIS e VIIRS (NASA FIRMS) para os filtros selecionados."
    >
      <MapLegend />

      {isPending ? (
        <LoadingState label="Carregando detecções…" />
      ) : error ? (
        <ErrorState
          message={error.message}
          // Só oferece nova tentativa quando a falha é recuperável (CA04).
          onRetry={
            error instanceof ApiError && !error.recoverable
              ? undefined
              : () => void refetch()
          }
        />
      ) : data.total === 0 ? (
        <EmptyState />
      ) : (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy={isFetching}
        >
          <Stat label="Total de detecções" value={data.total} />
          {(Object.keys(data.bySatellite) as DataSource[]).map((key) => (
            <Stat
              key={key}
              label={SOURCE_META[key].label}
              symbol={SOURCE_META[key].symbol}
              symbolClass={SOURCE_META[key].className}
              value={data.bySatellite[key] ?? 0}
            />
          ))}
        </div>
      )}
    </PageSection>
  );
}

function Stat({
  label,
  value,
  symbol,
  symbolClass,
}: {
  label: string;
  value: number;
  symbol?: string;
  symbolClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-space-600 bg-space-800 p-5">
      <p className="flex items-center gap-2 text-small text-ink-300">
        {symbol && (
          <span aria-hidden className={symbolClass}>
            {symbol}
          </span>
        )}
        {label}
      </p>
      <p className="mt-1 font-mono text-h2 font-bold">
        {value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
