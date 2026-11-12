import { dayNumber, formatLong } from "@/lib/utils/dates";
import type { DayStatus, MonthDay, Sensor } from "@/types/calendar";
import { FlameIcon } from "./flame-icon";

// Estado nunca só por cor (RN04): glifo + rótulo acessível + legenda.
export const STATUS_META: Record<
  DayStatus,
  { glyph: string; label: string; short: string }
> = {
  activity: { glyph: "●", label: "Atividade registrada", short: "Atividade" },
  none: { glyph: "○", label: "Nenhum registro de foco", short: "Sem registro" },
  unavailable: { glyph: "×", label: "Dados indisponíveis", short: "Indisponível" },
};

// Mesmas formas do mapa: VIIRS = círculo, MODIS = losango.
export const SENSOR_META: Record<
  Sensor,
  { glyph: string; short: string; color: string }
> = {
  MODIS: { glyph: "◆", short: "M", color: "text-ember-400" },
  VIIRS: { glyph: "●", short: "V", color: "text-fire-400" },
};
const SENSORS: Sensor[] = ["MODIS", "VIIRS"];

/** Contagens por sensor, apenas dos sensores que a API informou. */
export function sensorCounts(day: MonthDay): { sensor: Sensor; count: number }[] {
  if (day.status !== "activity" || !day.counts) return [];
  return SENSORS.flatMap((sensor) => {
    const count = day.counts?.[sensor];
    return count === undefined ? [] : [{ sensor, count }];
  });
}

/** Abrevia a partir de mil para caber na carta: 1234 → "1,2k", 15200 → "15k". */
export function compactCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k < 10 ? k.toFixed(1).replace(".", ",") : Math.round(k)}k`;
}

type DayTileProps = {
  day: MonthDay;
  index: number;
  isToday: boolean;
  selected: boolean;
  onSelect: (date: string) => void;
};

export function DayTile({ day, index, isToday, selected, onSelect }: DayTileProps) {
  const meta = STATUS_META[day.status];
  const counts = sensorCounts(day);
  const countsText = counts
    .map(({ sensor, count }) => `${count} focos ${sensor}`)
    .join(", ");
  const label = `${formatLong(day.date)}${isToday ? " (hoje)" : ""}: ${meta.label}${
    countsText ? `, ${countsText}` : ""
  }`;

  return (
    <button
      type="button"
      onClick={() => onSelect(day.date)}
      aria-pressed={selected}
      aria-current={isToday ? "date" : undefined}
      aria-label={label}
      title={label}
      data-flipped={selected}
      data-status={day.status}
      data-today={isToday}
      style={{ animationDelay: `${Math.min(index, 31) * 18}ms` }}
      className="card-tile tile-in"
    >
      <span className="card-tile-inner">
        {/* Verso (RN03): escuro, número da data e símbolo de fogo */}
        <span className="card-face card-back">
          <span className="flex w-full items-center justify-between px-0.5">
            <span className="font-mono text-xs font-bold text-ink-100">
              {dayNumber(day.date)}
            </span>
            <span
              aria-hidden="true"
              className="font-mono text-[0.65rem] leading-none text-ink-300"
            >
              {meta.glyph}
            </span>
          </span>
          <FlameIcon
            className="h-8 w-6 drop-shadow-[0_0_6px_rgba(255,110,30,0.55)]"
            muted={day.status === "unavailable"}
          />
          {/* contagem por sensor — só quando informada pela API */}
          <span
            aria-hidden="true"
            className="flex h-3 w-full items-center justify-center gap-1 font-mono text-[0.6rem] font-bold leading-none"
          >
            {counts.map(({ sensor, count }) => (
              <span key={sensor} data-sensor={sensor} className="whitespace-nowrap">
                <span className={SENSOR_META[sensor].color}>
                  {SENSOR_META[sensor].glyph}
                </span>
                <span className="text-ink-100">{compactCount(count)}</span>
              </span>
            ))}
          </span>
        </span>
        {/* Frente (carta virada) */}
        <span className="card-face card-front">
          <span className="font-mono text-base font-bold leading-none">
            {dayNumber(day.date)}
          </span>
          <span className="text-sm leading-none" aria-hidden="true">
            {meta.glyph}
          </span>
        </span>
      </span>
    </button>
  );
}
