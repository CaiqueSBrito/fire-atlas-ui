import { HARMONIZED_META, SENSOR_META } from "@/lib/sensors";
import type { SensorId } from "@/types/detections";
import type { StatsResponse } from "@/types/stats";

const fmt = (n: number) => n.toLocaleString("pt-BR");

function Card({
  label,
  symbol,
  color,
  badge,
  value,
  unit,
  unavailable,
}: {
  label: string;
  symbol?: string;
  color?: string;
  badge?: string;
  value?: number | null;
  unit?: string;
  unavailable?: string;
}) {
  const missing = value === null || value === undefined;
  return (
    <div className="rounded-2xl border border-space-600 bg-space-800 p-5">
      <p className="flex items-center gap-2 text-small text-ink-300">
        {symbol && (
          <span aria-hidden style={{ color }}>
            {symbol}
          </span>
        )}
        {label}
        {badge && (
          <span className="ml-auto rounded-full border border-space-600 px-2 py-0.5 text-caption">
            {badge}
          </span>
        )}
      </p>
      {missing ? (
        <>
          <p className="mt-1 font-mono text-h2 font-bold text-ink-300">—</p>
          <p className="text-caption text-ink-300">
            Indisponível{unavailable ? `: ${unavailable}` : "."}
          </p>
        </>
      ) : (
        <p className="mt-1 font-mono text-h2 font-bold">
          {fmt(value)}
          {unit && <span className="ml-2 text-small font-normal text-ink-300">{unit}</span>}
        </p>
      )}
    </div>
  );
}

export function IndicatorCards({
  stats,
  sensors,
}: {
  stats: StatsResponse;
  sensors: SensorId[];
}) {
  const total = sensors.every((s) => typeof stats.bySensor[s] === "number")
    ? sensors.reduce((acc, s) => acc + (stats.bySensor[s] as number), 0)
    : null;
  const frp = stats.frp;

  return (
    <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {sensors.map((s) => (
        <Card
          key={s}
          label={`Detecções ${SENSOR_META[s].label}`}
          symbol={SENSOR_META[s].symbol}
          color={SENSOR_META[s].hex}
          badge="original"
          value={stats.bySensor[s]}
          unit="detecções"
          unavailable="a API não informou esta contagem"
        />
      ))}
      <Card
        label="Total (originais)"
        value={total}
        unit="detecções"
        unavailable="falta contagem de algum sensor"
      />
      <Card
        label="Detecções harmonizadas"
        symbol={HARMONIZED_META.symbol}
        color={HARMONIZED_META.hex}
        badge="harmonizado"
        value={stats.harmonized?.total}
        unit="detecções"
        unavailable="harmonização ainda não validada"
      />
      <Card
        label={frp?.unit ? `FRP médio (${frp.unit})` : "FRP médio"}
        value={frp?.mean}
        unit={frp?.unit}
        unavailable="o dado de FRP não foi fornecido"
      />
    </section>
  );
}
