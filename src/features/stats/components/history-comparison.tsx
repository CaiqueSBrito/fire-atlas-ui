import { cellToLatLng } from "h3-js";
import { LoadingState } from "@/components/feedback/loading-state";
import { QueryErrorState } from "@/components/feedback/query-error-state";
import type { CellHistory } from "@/types/stats";
import { Unavailable } from "./unavailable";

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const br = (d: string) => d.split("-").reverse().join("/");

function cellPosition(cell: string) {
  try {
    const [lat, lon] = cellToLatLng(cell);
    return `${Math.abs(lat).toFixed(2).replace(".", ",")}° ${lat < 0 ? "S" : "N"}, ${Math.abs(lon)
      .toFixed(2)
      .replace(".", ",")}° ${lon < 0 ? "O" : "L"}`;
  } catch {
    return null;
  }
}

type HistoryComparisonProps = {
  enabled: boolean;
  cell: string | null;
  history: CellHistory | null | undefined;
  isPending: boolean;
  error: Error | null;
  onRetry: () => void;
};

export function HistoryComparison({ enabled, cell, history, isPending, error, onRetry }: HistoryComparisonProps) {
  let body: React.ReactNode;
  if (!enabled) {
    body = (
      <Unavailable>
        A comparação histórica por célula usa os dados reais da API; sem ela não há série de anos anteriores.
      </Unavailable>
    );
  } else if (!cell) {
    body = (
      <Unavailable>
        Nenhuma célula H3 no ranking deste recorte. Escolha uma região ou período com detecções.
      </Unavailable>
    );
  } else if (isPending) {
    body = <LoadingState label="Consultando os anos anteriores…" />;
  } else if (error) {
    body = <QueryErrorState error={error} onRetry={onRetry} />;
  } else if (!history) {
    body = <Unavailable>A API não devolveu a comparação para os sensores selecionados.</Unavailable>;
  } else {
    body = <Body h={history} />;
  }

  return (
    <section aria-labelledby="history-title" className="rounded-2xl border border-space-600 bg-space-800 p-5">
      <h2 id="history-title" className="font-display text-lg font-bold">
        Comparação histórica
      </h2>
      <p className="mt-1 text-small text-ink-300">
        O mês da célula H3 selecionada no ranking contra o mesmo período do mês nos 5 anos anteriores.
      </p>
      <div className="mt-3">{body}</div>
    </section>
  );
}

function Body({ h }: { h: CellHistory }) {
  const position = cellPosition(h.cell);
  const byYear = new Map(h.years.map((y) => [y.year, y.detections]));
  const previous = Array.from({ length: h.yearsRequested }, (_, i) => h.current.year - h.yearsRequested + i);
  const max = Math.max(h.current.detections, ...h.years.map((y) => y.detections), 1);
  const rows = [
    ...previous.map((year) => ({ year, value: byYear.get(year) ?? null, current: false })),
    { year: h.current.year, value: h.current.detections, current: true },
  ];
  const period = `${br(h.start).slice(0, 5)} a ${br(h.end).slice(0, 5)}`;

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-small">
        <dt className="text-ink-300">Célula</dt>
        <dd>
          <span className="font-mono">{h.cell}</span>
          {position && <span className="text-ink-300"> · {position}</span>}
        </dd>
        <dt className="text-ink-300">Período</dt>
        <dd>
          {period} ({h.days} {h.days === 1 ? "dia" : "dias"}) de cada ano
        </dd>
      </dl>

      <ul aria-label="Detecções no mesmo período de cada ano" className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.year} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 text-small">
            <span className={r.current ? "font-semibold text-ink-100" : "text-ink-300"}>{r.year}</span>
            <span className="h-3 rounded-full bg-space-900">
              {r.value !== null && (
                <span
                  className={`block h-3 rounded-full ${r.current ? "bg-ember-400" : "bg-ink-300"}`}
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
              )}
            </span>
            <span className="font-mono">
              {r.value === null ? <span className="text-ink-300">sem registro</span> : `${fmt(r.value)} detecções`}
            </span>
          </li>
        ))}
      </ul>

      {h.sufficient && h.meanPerDay !== null ? (
        <div className="flex flex-col gap-1">
          <p className="font-mono text-h2 font-bold">
            {h.changePct === null
              ? "—"
              : `${h.changePct > 0 ? "+" : h.changePct < 0 ? "−" : ""}${fmt(Math.abs(h.changePct))}%`}
            <span className="ml-2 text-small font-normal text-ink-300">em relação à média dos anos anteriores</span>
          </p>
          <p className="text-small text-ink-300">
            {fmt(h.currentPerDay)} detecções/dia agora contra {fmt(h.meanPerDay)} na média de {h.yearsWithData}{" "}
            {h.yearsWithData === 1 ? "ano" : "anos"} com registro.{" "}
            {h.anomalousSensors.length > 0
              ? `Atípico para ${h.anomalousSensors.join(" e ")} (|z| ≥ 2).`
              : "Dentro da variação habitual (|z| < 2)."}
          </p>
        </div>
      ) : (
        <Unavailable>
          Comparação indisponível: {h.yearsWithData} {h.yearsWithData === 1 ? "ano anterior" : "anos anteriores"} com
          registro nesta célula; são necessários {h.minYears}.
          {h.notes.length > 0 && ` ${h.notes.join(" ")}`}
        </Unavailable>
      )}

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-small">
        <dt className="text-ink-300">Método</dt>
        <dd>
          Detecções por dia no período contra a média das mesmas datas nos anos anteriores com registro; atípico se
          |z| ≥ 2 em algum sensor.
        </dd>
        <dt className="text-ink-300">Atenção</dt>
        <dd>
          MODIS e VIIRS são somados quando os dois estão selecionados, mas não são diretamente comparáveis entre si.
          Ano sem registro não é ano sem fogo.
        </dd>
      </dl>
    </div>
  );
}
