"use client";

import { useId } from "react";
import { Toggle } from "@/components/ui/toggle";
import { PLOT_OPTIONS, type BasemapId, type PlotId } from "@/lib/map-layers";

const radio =
  "flex cursor-pointer items-start gap-3 rounded-xl border border-space-600 p-3 has-[:checked]:border-ember-400 has-[:checked]:bg-space-800 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus-ring)";

export function Group({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-t border-space-600 pt-1">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-small font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-4 w-4 text-ink-300 transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div role="group" aria-label={title} className="flex flex-col gap-2 pb-3">
        {children}
      </div>
    </details>
  );
}

export function LayerPanel({
  base,
  plot = "points",
  gridOnly = null,
  dots = true,
  heat,
  onChange,
}: {
  base: BasemapId;
  plot?: PlotId;
  gridOnly?: { resolution: number } | null;
  dots?: boolean;
  heat: boolean;
  onChange: (next: {
    base?: BasemapId;
    plot?: PlotId;
    dots?: boolean;
    heat?: boolean;
  }) => void;
}) {
  const plotName = useId();
  const illustrated = base === "illustrated";

  return (
    <section aria-labelledby="layers-title" className="flex flex-col">
      <h2 id="layers-title" className="mb-1 text-small font-semibold tracking-[-0.02em] text-ink-300">
        Camadas do mapa
      </h2>

      <Group title="Visualização dos focos">
        {gridOnly && (
          <p className="rounded-xl border border-space-600 p-3 text-caption text-ink-300">
            A fonte de dados agrega os focos por célula H3 (resolução {gridOnly.resolution}).
            Pontos individuais não estão disponíveis.
          </p>
        )}
        {!gridOnly && PLOT_OPTIONS.map((o) => (
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
        {plot === "hex" && !gridOnly && (
          <Toggle
            checked={dots}
            onChange={(next) => onChange({ dots: next })}
            label="Mostrar pontos sobre os hexágonos"
            description="Ao aproximar o zoom, cada detecção ◆ ● aparece por cima da célula; clique para ver os detalhes"
          />
        )}
      </Group>

      <Group title="Sobreposições">
        <Toggle
          checked={heat}
          onChange={(next) => onChange({ heat: next })}
          label="Mapa de calor"
          description="Densidade de focos, ponderada pela FRP quando informada"
        />
      </Group>

      <Group title="Configurações">
        <Toggle
          checked={illustrated}
          onChange={(next) => onChange({ base: next ? "illustrated" : "streets" })}
          label="Mapa ilustrado"
          description="Países e estados em tons de cinza, no lugar do mapa base"
        />
      </Group>
    </section>
  );
}
