"use client";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { REGIONS } from "@/config/regions";
import { Unavailable } from "@/features/stats/components/unavailable";
import { useForecast } from "@/hooks/use-detections";
import { ApiError } from "@/lib/api/client";
import type { Bbox } from "@/types/detections";
import type { ForecastResponse } from "@/types/forecast";
import { fmtCoords, fmtDate, fmtInt, fmtNum, fmtPct, place } from "../format";
import { ForecastMap } from "./forecast-map";

type Available = Extract<ForecastResponse, { status: "available" }>;

const TABLE_ROWS = 100;

function PredictedBanner() {
  return (
    <p
      role="note"
      className="rounded-xl border-2 border-dashed border-[#ff5a4f] bg-[#ff5a4f]/10 p-3 text-small"
    >
      <strong>PREVISÃO — não são detecções observadas.</strong> Probabilidade de fogo
      nos 7 dias seguintes à emissão, calculada pelo modelo do pipeline de dados.
    </p>
  );
}

function Card({
  label,
  value,
  unit,
  unavailable,
}: {
  label: string;
  value: string | null;
  unit?: string;
  unavailable: string;
}) {
  return (
    <div className="rounded-2xl border border-space-600 bg-space-800 p-5">
      <p className="text-small text-ink-300">{label}</p>
      {value === null ? (
        <>
          <p className="mt-1 font-mono text-h2 font-bold text-ink-300">—</p>
          <p className="text-caption text-ink-300">Indisponível: {unavailable}</p>
        </>
      ) : (
        <p className="mt-1 font-mono text-h2 font-bold">
          {value}
          {unit && <span className="ml-2 text-small font-normal text-ink-300">{unit}</span>}
        </p>
      )}
    </div>
  );
}

function RiskTable({ data }: { data: Available }) {
  const rows = data.cells.slice(0, TABLE_ROWS);
  return (
    <details className="group rounded-2xl border border-space-600 bg-space-800 p-5">
      <summary className="cursor-pointer font-display text-lg font-bold">
        Ver tabela das células ({fmtInt(rows.length)} de maior probabilidade)
      </summary>
      <p className="mt-1 text-small text-ink-300">
        Os mesmos dados do mapa, em texto. Cidade mais próxima e distância segundo a base de lugares.
      </p>
      <div className="mt-3 max-h-[32rem] overflow-auto rounded-lg border border-space-600">
        <table className="w-full text-small">
          <caption className="sr-only">
            Células H3 ordenadas da maior para a menor probabilidade de fogo em 7 dias
          </caption>
          <thead className="sticky top-0 bg-space-900">
            <tr>
              <th scope="col" className="px-3 py-2 text-left">#</th>
              <th scope="col" className="px-3 py-2 text-left">Localidade</th>
              <th scope="col" className="px-3 py-2 text-left">Coordenadas</th>
              <th scope="col" className="px-3 py-2 text-right">Probabilidade 7 dias</th>
              <th scope="col" className="px-3 py-2 text-right">Focos 24 h</th>
              <th scope="col" className="px-3 py-2 text-right">Focos 7 dias</th>
              <th scope="col" className="px-3 py-2 text-right">FRP médio 7 dias (MW)</th>
              <th scope="col" className="px-3 py-2 text-left">Fogo ativo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={c.id} className="border-t border-space-600">
                <td className="px-3 py-1.5 font-mono text-ink-300">{i + 1}</td>
                <th scope="row" className="px-3 py-1.5 text-left font-normal">
                  {place(c)}
                  <span className="block font-mono text-caption text-ink-300">{c.id}</span>
                </th>
                <td className="px-3 py-1.5 font-mono">{fmtCoords(c)}</td>
                <td className="px-3 py-1.5 text-right font-mono">{fmtPct(c.probability)}%</td>
                <td className="px-3 py-1.5 text-right font-mono">{fmtNum(c.detections24h, 0)}</td>
                <td className="px-3 py-1.5 text-right font-mono">{fmtNum(c.detections7d, 0)}</td>
                <td className="px-3 py-1.5 text-right font-mono">{fmtNum(c.frpMean7d)}</td>
                <td className="px-3 py-1.5">
                  {c.active === null ? "—" : c.active ? "Sim" : "Não"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Report({ data, regionBbox }: { data: Available; regionBbox: Bbox }) {
  const { summary } = data;
  return (
    <div className="flex flex-col gap-6">
      <PredictedBanner />
      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          label="Células com previsão"
          value={fmtInt(summary.cells)}
          unit="células H3"
          unavailable="a API não informou"
        />
        <Card
          label="Células com fogo ativo"
          value={fmtInt(summary.activeCells)}
          unit="células H3"
          unavailable="a API não informou"
        />
        <Card
          label="Maior probabilidade"
          value={fmtPct(summary.maxProbability)}
          unit="%"
          unavailable="nenhuma célula na região"
        />
        <Card
          label="Probabilidade média"
          value={fmtPct(summary.meanProbability)}
          unit="%"
          unavailable="nenhuma célula na região"
        />
      </section>

      {summary.cells === 0 ? (
        <EmptyState
          title="Nenhuma célula com previsão nesta região"
          description="O modelo não gerou previsão para esta área na emissão mais recente. Isso não significa ausência de risco de fogo."
        />
      ) : (
        <>
          <ForecastMap
            cells={data.cells}
            totalCells={data.summary.cells}
            truncated={data.truncated}
            regionBbox={regionBbox}
          />
          <RiskTable data={data} />
        </>
      )}

      <section
        aria-labelledby="forecast-meta-title"
        className="rounded-2xl border border-space-600 bg-space-900 p-5 text-small text-ink-300"
      >
        <h2 id="forecast-meta-title" className="font-display text-base font-bold text-ink-100">
          Metadados
        </h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt>Emissão</dt>
          <dd className="font-mono text-ink-100">{fmtDate(data.issueDate)}</dd>
          <dt>Origem</dt>
          <dd className="text-ink-100">{data.source}</dd>
          <dt>Método</dt>
          <dd className="text-ink-100">{data.method}</dd>
          <dt>Unidade espacial</dt>
          <dd className="text-ink-100">célula H3 de resolução 6 (aresta média de ~3,7 km)</dd>
        </dl>
      </section>
    </div>
  );
}

export function ForecastView() {
  const { data, error, isPending, isFetching, refetch, filters, enabled } = useForecast();
  const regionLabel = filters.customArea
    ? "Área personalizada"
    : REGIONS.find((r) => r.id === filters.regionId)?.label ?? filters.regionId;
  const issue = data?.status === "available" ? ` · emissão de ${fmtDate(data.issueDate)}` : "";

  let body: React.ReactNode;
  if (filters.problem) {
    body = (
      <ErrorState
        title="Filtro inválido"
        message={`${filters.problem} Ajuste os filtros para consultar.`}
      />
    );
  } else if (enabled && isPending) {
    body = <LoadingState label="Consultando previsões…" />;
  } else if (error) {
    body = (
      <ErrorState
        message={error.message}
        onRetry={error instanceof ApiError && !error.recoverable ? undefined : () => void refetch()}
      />
    );
  } else if (data?.status === "unavailable") {
    body = <Unavailable>{data.reason} Nenhuma estimativa é exibida sem previsão do serviço.</Unavailable>;
  } else if (data) {
    body = (
      <div aria-busy={isFetching}>
        <Report data={data} regionBbox={filters.bbox} />
      </div>
    );
  }

  return (
    <PageSection
      title="Previsões"
      description={`Relatório de risco de fogo para ${regionLabel}${issue}. Usa a região dos filtros; período e sensores não se aplicam (a previsão cobre os 7 dias seguintes à emissão).`}
    >
      {body}
    </PageSection>
  );
}
