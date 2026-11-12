/* eslint-disable @next/next/no-img-element -- imagens vêm da API (origem externa) */
import type { Region } from "@/config/regions";
import { formatShort } from "@/lib/utils/dates";
import type {
  DayResponse,
  ImageryKind,
  PassTime,
  Sensor,
} from "@/types/calendar";
import { FlameIcon } from "./flame-icon";
import { RegionPlot } from "./region-plot";

export const PASS_TIME_LABEL: Record<PassTime, string> = {
  all: "Dia inteiro",
  day: "Passagem diurna",
  night: "Passagem noturna",
};

const SENSORS: Sensor[] = ["MODIS", "VIIRS"];

type ActivityCardProps = {
  data: DayResponse;
  region: Region;
  view: ImageryKind | null;
};

// Frente da carta (RN04): região, data, sensores e medições disponíveis.
export function ActivityCard({ data, region, view }: ActivityCardProps) {
  const imagery = view ? data.imagery.find((i) => i.kind === view) : undefined;
  const total = data.counts
    ? SENSORS.reduce((acc, s) => acc + (data.counts?.[s] ?? 0), 0)
    : null;

  return (
    <article
      key={`${data.date}|${data.region}`}
      aria-label={`Carta de ${region.label} em ${formatShort(data.date)}`}
      className="card-gold card-flip-in w-full max-w-sm rounded-2xl p-4"
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-widest text-space-800/80">
            Registro de atividade
          </p>
          <h3 className="font-display text-2xl font-bold text-space-950">
            {region.label}
          </h3>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full border border-space-950/30 bg-space-950/10">
          <FlameIcon className="h-6 w-[1.125rem]" muted={data.status === "unavailable"} />
        </span>
      </header>

      <div className="mt-3 aspect-[3/2] overflow-hidden rounded-lg border-2 border-space-950/60 bg-space-900">
        {data.status === "unavailable" ? (
          <div className="grid h-full place-items-center p-4 text-center text-small text-ink-300">
            Dados indisponíveis para esta data — nenhuma detecção é exibida.
          </div>
        ) : imagery ? (
          <img
            src={imagery.url}
            alt={`Imagem ${imagery.kind === "thermal" ? "térmica" : "geográfica"} de ${region.label}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <RegionPlot
            region={region}
            detections={data.detections}
            title={`Posição das ${data.detections.length} detecções em ${region.label}`}
          />
        )}
      </div>

      <p className="mt-1 text-[0.7rem] text-space-950/80">
        {imagery
          ? `Fonte: ${imagery.source} · imagem de ${formatShort(imagery.date)}`
          : data.status === "unavailable"
            ? `Fonte consultada: ${data.source.name}`
            : `Fonte: ${data.source.name} · posições aproximadas (sem mapa base)`}
      </p>

      <div className="mt-1 flex justify-between font-mono text-small text-space-950">
        <span>{formatShort(data.date)}</span>
        <span>{PASS_TIME_LABEL[data.passTime]}</span>
      </div>

      <dl className="mt-2 divide-y divide-space-950/20 text-small text-space-950">
        {data.status === "unavailable" ? (
          <div className="py-2 font-semibold">Dados indisponíveis</div>
        ) : data.status === "none" ? (
          <div className="py-2 font-semibold">
            Nenhum foco registrado (dado disponível, zero detecções)
          </div>
        ) : (
          <>
            {SENSORS.map((s) =>
              data.counts?.[s] !== undefined ? (
                <div key={s} className="flex justify-between py-1.5">
                  <dt>Focos {s}</dt>
                  <dd className="font-mono font-bold">{data.counts[s]}</dd>
                </div>
              ) : null,
            )}
            {total !== null && (
              <div className="flex justify-between py-1.5">
                <dt>Total detectado</dt>
                <dd className="font-mono font-bold">{total}</dd>
              </div>
            )}
          </>
        )}
      </dl>

      {data.source.simulated && (
        <p className="mt-2 rounded bg-space-950/15 px-2 py-1 text-center text-[0.7rem] font-semibold text-space-950">
          Protótipo · dados simulados
        </p>
      )}
    </article>
  );
}
