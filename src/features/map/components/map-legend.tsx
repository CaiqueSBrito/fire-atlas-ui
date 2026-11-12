import type { DataSource } from "@/types/fires";

// Cor + forma + texto: a origem nunca é identificada só pela cor.
export const SOURCE_META: Record<
  DataSource,
  { label: string; symbol: string; className: string }
> = {
  modis: { label: "MODIS", symbol: "●", className: "text-ember-400" },
  viirs: { label: "VIIRS", symbol: "▲", className: "text-earth-400" },
  harmonized: { label: "Harmonizado", symbol: "◆", className: "text-fire-400" },
};

export function MapLegend() {
  return (
    <ul aria-label="Legenda" className="flex flex-wrap gap-x-5 gap-y-1">
      {(Object.keys(SOURCE_META) as DataSource[]).map((key) => (
        <li key={key} className="flex items-center gap-2 text-small">
          <span aria-hidden className={SOURCE_META[key].className}>
            {SOURCE_META[key].symbol}
          </span>
          {SOURCE_META[key].label}
        </li>
      ))}
    </ul>
  );
}
