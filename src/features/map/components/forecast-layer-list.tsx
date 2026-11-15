import type { ForecastCell } from "@/types/forecast";

const pct = (p: number) => `${Math.round(p * 100)}%`;

export function ForecastLayerList({
  cells,
  issueDate,
  truncated,
}: {
  cells: ForecastCell[];
  issueDate: string;
  truncated: boolean;
}) {
  const top = cells.slice(0, 10);
  return (
    <section aria-labelledby="forecast-list-title" className="flex flex-col gap-2">
      <p
        role="note"
        className="rounded-xl border-2 border-dashed border-[#ff5a4f] bg-[#ff5a4f]/10 p-3 text-caption text-ink-100"
      >
        <strong>PREVISÃO — não são detecções observadas.</strong> Probabilidade de fogo nos próximos 7 dias,
        emissão de {issueDate.split("-").reverse().join("/")}.
        {truncated && ` Mostrando as ${cells.length.toLocaleString("pt-BR")} células de maior probabilidade.`}
      </p>
      <h2 id="forecast-list-title" className="text-small font-semibold tracking-[-0.02em] text-ink-300">
        Maiores probabilidades na área visível
      </h2>
      {top.length === 0 ? (
        <p className="text-caption text-ink-300">Nenhuma célula com previsão nesta área.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {top.map((c) => (
            <li
              key={c.id}
              className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-space-600 px-3 text-small"
            >
              <span className="font-mono font-semibold text-[#ff5a4f]">{pct(c.probability)}</span>
              <span className="truncate text-ink-100">
                {c.city ? `perto de ${c.city}` : `${c.lat.toFixed(1)}°, ${c.lon.toFixed(1)}°`}
                {c.country ? ` · ${c.country}` : ""}
              </span>
              {c.active && (
                <span className="ml-auto shrink-0 rounded-full border border-ember-400/60 px-2 text-caption text-ember-400">
                  fogo recente
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
