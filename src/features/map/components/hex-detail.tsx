import { Button } from "@/components/ui/button";
import { SENSOR_META } from "@/lib/sensors";
import { cn } from "@/lib/utils/cn";
import type { HexCell } from "@/lib/utils/hex";

const fmtValue = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const fmtDay = (d: string) => d.split("-").reverse().join("/");

export function activityPeriod(firstDay: string | null, lastDay: string | null): string | null {
  if (!firstDay || !lastDay) return null;
  return firstDay === lastDay ? `em ${fmtDay(firstDay)}` : `de ${fmtDay(firstDay)} a ${fmtDay(lastDay)}`;
}

const fmtKm = (km: number) => `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;

export function HexDetail({
  cell,
  shown,
  total,
  truncated,
  view3d,
  onToggle3d,
  onClose,
  harmonizedUnit,
  period,
}: {
  cell: HexCell;
  harmonizedUnit?: string;
  period?: { from: string; to: string };
  shown: number;
  total: number;
  truncated: boolean;
  view3d: boolean;
  onToggle3d: () => void;
  onClose: () => void;
}) {
  const detections = cell.modis + cell.viirs;
  const activePeriod = cell.activity ? activityPeriod(cell.activity.firstDay, cell.activity.lastDay) : null;
  const zeroWithDetections = Boolean(harmonizedUnit) && cell.count === 0 && detections > 0;
  const rows: Array<[string, string]> = [
    ...(period ? ([["Período consultado", `${fmtDay(period.from)} a ${fmtDay(period.to)}`]] as Array<[string, string]>) : []),
    ...(activePeriod ? ([["Atividade registrada", activePeriod]] as Array<[string, string]>) : []),
    ...(cell.activity
      ? ([["Dias com dado", `${cell.activity.daysWithData} ${cell.activity.daysWithData === 1 ? "dia" : "dias"}`]] as Array<
          [string, string]
        >)
      : []),
    harmonizedUnit
      ? ["Atividade harmonizada", fmtValue(cell.count)]
      : ["Focos na célula", cell.count.toLocaleString("pt-BR")],
    [harmonizedUnit ? "◆ MODIS (detecções)" : "◆ MODIS", cell.modis.toLocaleString("pt-BR")],
    [harmonizedUnit ? "● VIIRS (detecções)" : "● VIIRS", cell.viirs.toLocaleString("pt-BR")],
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
      <dl className="mt-3 grid gap-3 text-small">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5">
            <dt className="text-caption text-ink-300">{k}</dt>
            <dd className="break-words font-mono text-ink-100">{v}</dd>
          </div>
        ))}
      </dl>
      {zeroWithDetections && (
        <p role="note" className="mt-3 rounded-xl border border-dashed border-space-600 p-3 text-caption text-ink-300">
          Houve {detections.toLocaleString("pt-BR")} {detections === 1 ? "detecção" : "detecções"} de satélite
          {activePeriod ? ` ${activePeriod}` : ""}, mas a harmonização não confirmou atividade nesta célula (valor 0).
          Isso acontece, por exemplo, quando só um sensor viu o foco e o outro, disponível no mesmo dia, não confirmou.
        </p>
      )}
      {harmonizedUnit && (
        <p className="mt-2 text-caption text-ink-300">
          {harmonizedUnit}: não é número de focos. MODIS e VIIRS mostram as detecções que entraram na
          harmonização.
        </p>
      )}
      <Button variant="secondary" className="mt-4 w-full" onClick={onToggle3d}>
        {view3d ? "Voltar ao 2D" : "Ver em 3D"}
      </Button>
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
  harmonized = false,
}: {
  cells: HexCell[];
  harmonized?: boolean;
  selectedId: string | null;
  onSelect: (cell: HexCell) => void;
}) {
  if (!cells.length) return null;
  return (
    <section aria-labelledby="hex-top-title">
      <h2 id="hex-top-title" className="text-small font-semibold tracking-[-0.02em] text-ink-300">
        {harmonized ? "Hexágonos com mais atividade harmonizada" : "Hexágonos com mais focos"}
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
              <span className="font-mono font-semibold">{fmtValue(c.count)}</span>
              <span className="text-ink-300">{harmonized ? "ativ." : "focos"}</span>
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
