import { HEAT_RAMP, NDVI_RAMP, TEMPERATURE_RAMP, type BasemapId } from "@/lib/map-layers";
import { SENSOR_META, SENSORS } from "@/lib/sensors";
import type { SensorId } from "@/types/detections";

const ramp = (colors: string[]) => `linear-gradient(to right, ${colors.join(", ")})`;

function Gradient({
  title,
  colors,
  low,
  mid,
  high,
  note,
}: {
  title: string;
  colors: string[];
  low: string;
  mid?: string;
  high: string;
  note?: string;
}) {
  return (
    <li className="flex flex-col gap-1">
      <span>{title}</span>
      <span aria-hidden className="h-2.5 rounded-full" style={{ background: ramp(colors) }} />
      <span className="flex justify-between text-caption text-ink-300">
        <span>{low}</span>
        {mid && <span>{mid}</span>}
        <span>{high}</span>
      </span>
      {note && <span className="text-caption text-ink-300">{note}</span>}
    </li>
  );
}

export function MapLegend({
  counts,
  enabled,
  showMatches = false,
  showForecast = false,
  basemap = "satellite",
  showHeat = false,
  showTemperature = false,
}: {
  counts?: Partial<Record<SensorId, number>>;
  enabled?: SensorId[];
  showMatches?: boolean;
  showForecast?: boolean;
  basemap?: BasemapId;
  showHeat?: boolean;
  showTemperature?: boolean;
}) {
  return (
    <section aria-labelledby="legend-title">
      <h2
        id="legend-title"
        className="text-caption uppercase tracking-wider text-ink-300"
      >
        Legenda
      </h2>
      <ul className="mt-2 flex flex-col gap-1.5 text-small">
        {SENSORS.map((s) => {
          const on = !enabled || enabled.includes(s);
          return (
            <li key={s} className="flex items-center gap-2">
              <span
                aria-hidden
                style={{ color: SENSOR_META[s].hex }}
                className={on ? "" : "opacity-30"}
              >
                {SENSOR_META[s].symbol}
              </span>
              <span className={on ? "" : "text-ink-300"}>
                {SENSOR_META[s].label}
                <span className="text-ink-300"> · {SENSOR_META[s].platforms}</span>
                {!on && <span className="text-ink-300"> (oculto)</span>}
              </span>
              {on && counts?.[s] !== undefined && (
                <span className="ml-auto font-mono text-ink-300">
                  {counts[s]!.toLocaleString("pt-BR")}
                </span>
              )}
            </li>
          );
        })}
        {showMatches && (
          <li className="flex items-center gap-2">
            <span aria-hidden className="grid h-4 w-4 place-items-center rounded-full border-2 border-white" />
            Correspondência entre sensores (harmonização validada)
          </li>
        )}
        {showForecast && (
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-3 w-5 border-2 border-dashed border-[#c4a1ff] bg-[#c4a1ff]/20" />
            Previsto — não é detecção observada
          </li>
        )}
        {showHeat && (
          <Gradient
            title="Mapa de calor (densidade de focos)"
            colors={HEAT_RAMP}
            low="Menor densidade"
            high="Maior densidade"
          />
        )}
        {showTemperature && (
          <Gradient
            title="Temperatura máxima do ar (só sobre a terra)"
            colors={TEMPERATURE_RAMP.colors}
            low={TEMPERATURE_RAMP.low}
            mid={TEMPERATURE_RAMP.mid}
            high={TEMPERATURE_RAMP.high}
            note="Dados: Open-Meteo.com (CC BY 4.0)"
          />
        )}
        {basemap === "vegetation" && (
          <Gradient
            title="Vegetação (NDVI, MODIS)"
            colors={NDVI_RAMP.colors}
            low={NDVI_RAMP.low}
            mid={NDVI_RAMP.mid}
            high={NDVI_RAMP.high}
          />
        )}
        {basemap === "illustrated" && (
          <li className="text-caption text-ink-300">
            Tons de cinza são apenas decorativos e não representam dados.
            Divisões internas só existem para os maiores países.
          </li>
        )}
      </ul>
    </section>
  );
}
