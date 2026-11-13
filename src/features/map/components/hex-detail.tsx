import { SENSOR_META } from "@/lib/sensors";
import { cn } from "@/lib/utils/cn";
import type { HexCell } from "@/lib/utils/hex";

const fmtKm = (km: number) => `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;

export function HexDetail({
  cell,
  shown,
  total,
  truncated,
  onClose,
}: {
  cell: HexCell;
  shown: number;
  total: number;
  truncated: boolean;
  onClose: () => void;
}) {
  const rows: Array<[string, string]> = [
    ["Focos na célula", cell.count.toLocaleString("pt-BR")],
    ["◆ MODIS", cell.modis.toLocaleString("pt-BR")],
    ["● VIIRS", cell.viirs.toLocaleString("pt-BR")],
    ["Resolução H3", `${cell.res} (aresta ≈ ${fmtKm(cell.edgeKm)})`],
    ["Centro", `${cell.center[1].toFixed(3)}°, ${cell.center[0].toFixed(3)}°`],
    ["Célula", cell.id],
  ];
  return (
    <section
      aria-labelledby="hex-title"
      className="rounded-2xl border border-ember-400/50 bg-space-800 p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 id="hex-title" className="font-display text-lg font-bold">
          Hexágono H3
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-lg px-3 text-small text-ink-300 hover:text-ink-100"
        >
          Fechar
        </button>
      </div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-small">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-300">{k}</dt>
            <dd className="break-all font-mono text-ink-100">{v}</dd>
          </div>
        ))}
      </dl>
      {truncated && (
        <p className="mt-3 text-caption text-ink-300">
          Contagem sobre os {shown.toLocaleString("pt-BR")} pontos exibidos, de{" "}
          {total.toLocaleString("pt-BR")} no recorte.
        </p>
      )}
    </section>
  );
}

export function HexTopList({
  cells,
  selectedId,
  onSelect,
}: {
  cells: HexCell[];
  selectedId: string | null;
  onSelect: (cell: HexCell) => void;
}) {
  if (!cells.length) return null;
  return (
    <section aria-labelledby="hex-top-title">
      <h2 id="hex-top-title" className="text-caption uppercase tracking-wider text-ink-300">
        Hexágonos com mais focos
      </h2>
      <p className="mt-1 text-caption text-ink-300">
        Alternativa ao mapa: selecione para ver os detalhes.
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {cells.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c)}
              aria-pressed={c.id === selectedId}
              className={cn(
                "flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 text-left text-small",
                c.id === selectedId
                  ? "border-ember-400 bg-space-800"
                  : "border-space-600 hover:bg-space-800",
              )}
            >
              <span className="font-mono font-semibold">{c.count.toLocaleString("pt-BR")}</span>
              <span className="text-ink-300">focos</span>
              <span className="truncate text-ink-300">
                <span aria-hidden style={{ color: SENSOR_META.modis.hex }}>◆</span> {c.modis}{" "}
                <span aria-hidden style={{ color: SENSOR_META.viirs.hex }}>●</span> {c.viirs}
              </span>
              <span className="ml-auto font-mono text-caption text-ink-300">
                {c.center[1].toFixed(1)}°, {c.center[0].toFixed(1)}°
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
