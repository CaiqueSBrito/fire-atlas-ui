"use client";

import { useId } from "react";
import { BASEMAP_OPTIONS, PLOT_OPTIONS, type BasemapId, type PlotId } from "@/lib/map-layers";

const radio =
  "flex cursor-pointer items-start gap-3 rounded-xl border border-space-600 p-3 has-[:checked]:border-ember-400 has-[:checked]:bg-space-800 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus-ring)";

export function LayerPanel({
  base,
  plot = "points",
  dots = true,
  heat,
  temperature,
  imageryDate,
  temperatureState,
  onChange,
}: {
  base: BasemapId;
  plot?: PlotId;
  dots?: boolean;
  heat: boolean;
  temperature: boolean;
  imageryDate: string;
  temperatureState?: {
    status: "loading" | "error" | "ready";
    date: string;
    message?: string;
    onRetry: () => void;
  };
  onChange: (next: {
    base?: BasemapId;
    plot?: PlotId;
    dots?: boolean;
    heat?: boolean;
    temp?: boolean;
  }) => void;
}) {
  const name = useId();
  const plotName = useId();
  return (
    <section aria-labelledby="layers-title" className="flex flex-col gap-4">
      <h2 id="layers-title" className="text-caption uppercase tracking-wider text-ink-300">
        Camadas do mapa
      </h2>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-small font-semibold">Visualização dos focos</legend>
        {PLOT_OPTIONS.map((o) => (
          <label key={o.id} className={radio}>
            <input
              type="radio"
              name={plotName}
              value={o.id}
              checked={plot === o.id}
              onChange={() => onChange({ plot: o.id })}
              className="mt-1 accent-(--ember-400)"
            />
            <span className="flex flex-col">
              <span className="text-small font-semibold">{o.label}</span>
              <span className="text-caption text-ink-300">{o.description}</span>
            </span>
          </label>
        ))}
        {plot === "hex" && (
          <label className={radio}>
            <input
              type="checkbox"
              checked={dots}
              onChange={(e) => onChange({ dots: e.target.checked })}
              className="mt-1 accent-(--ember-400)"
            />
            <span className="flex flex-col">
              <span className="text-small font-semibold">Mostrar pontos sobre os hexágonos</span>
              <span className="text-caption text-ink-300">
                Ao aproximar o zoom, cada detecção ◆ ● aparece por cima da célula; clique para ver os detalhes
              </span>
            </span>
          </label>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-small font-semibold">Mapa base</legend>
        {BASEMAP_OPTIONS.map((o) => (
          <label key={o.id} className={radio}>
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={base === o.id}
              onChange={() => onChange({ base: o.id })}
              className="mt-1 accent-(--ember-400)"
            />
            <span className="flex flex-col">
              <span className="text-small font-semibold">{o.label}</span>
              <span className="text-caption text-ink-300">{o.description}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-small font-semibold">Sobreposições</legend>
        <label className={radio}>
          <input
            type="checkbox"
            checked={heat}
            onChange={(e) => onChange({ heat: e.target.checked })}
            className="mt-1 accent-(--ember-400)"
          />
          <span className="flex flex-col">
            <span className="text-small font-semibold">Mapa de calor</span>
            <span className="text-caption text-ink-300">
              Densidade de focos, ponderada pela FRP quando informada
            </span>
          </span>
        </label>
        <label className={radio}>
          <input
            type="checkbox"
            checked={temperature}
            onChange={(e) => onChange({ temp: e.target.checked })}
            className="mt-1 accent-(--ember-400)"
          />
          <span className="flex flex-col">
            <span className="text-small font-semibold">Temperatura da superfície</span>
            <span className="text-caption text-ink-300">
              Temperatura máxima do ar do dia, só sobre a terra (Open-Meteo)
            </span>
          </span>
        </label>
      </fieldset>

      {base === "vegetation" && (
        <p className="text-caption text-ink-300">
          Imagens da NASA de <span className="font-mono">{imageryDate.split("-").reverse().join("/")}</span>{" "}
          (as mais recentes ficam disponíveis com alguns dias de atraso).
        </p>
      )}

      {temperature && temperatureState?.status === "loading" && (
        <p role="status" className="text-caption text-ink-300">
          Carregando temperatura…
        </p>
      )}
      {temperature && temperatureState?.status === "error" && (
        <div role="alert" className="flex flex-col items-start gap-2 text-caption">
          <p className="text-fire-400">
            {temperatureState.message ?? "Não foi possível carregar a temperatura."}
          </p>
          <button
            type="button"
            onClick={temperatureState.onRetry}
            className="min-h-11 rounded-full border border-space-600 px-4 text-small font-semibold hover:border-ink-300"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {temperature && temperatureState?.status === "ready" && (
        <p className="text-caption text-ink-300">
          Temperatura máxima do ar em{" "}
          <span className="font-mono">{temperatureState.date.split("-").reverse().join("/")}</span>.
        </p>
      )}
    </section>
  );
}
