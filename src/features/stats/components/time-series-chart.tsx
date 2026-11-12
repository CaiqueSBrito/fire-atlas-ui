"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import { HARMONIZED_META, SENSOR_META } from "@/lib/sensors";
import { formatShort } from "@/lib/utils/dates";
import type { SensorId } from "@/types/detections";
import type { SeriesPoint } from "@/types/stats";

type SeriesKey = SensorId | "harmonized";
const W = 760;
const H = 280;
const M = { l: 52, r: 76, t: 14, b: 30 };
const fmt = (n: number) => n.toLocaleString("pt-BR");

const META: Record<SeriesKey, { label: string; symbol: string; hex: string }> = {
  modis: SENSOR_META.modis,
  viirs: SENSOR_META.viirs,
  harmonized: HARMONIZED_META,
};

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}

export function TimeSeriesChart({
  series,
  sensors,
}: {
  series: SeriesPoint[];
  sensors: SensorId[];
}) {
  const titleId = useId();
  const [active, setActive] = useState<number | null>(null);
  const keys: SeriesKey[] = [
    ...sensors,
    ...(series.some((p) => typeof p.harmonized === "number") ? (["harmonized"] as const) : []),
  ];
  const n = series.length;
  const values = series.flatMap((p) => keys.map((k) => p[k]).filter((v): v is number => typeof v === "number"));
  const max = niceMax(Math.max(0, ...values));
  const x = (i: number) =>
    n <= 1 ? (M.l + W - M.r) / 2 : M.l + (i / (n - 1)) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - (v / max) * (H - M.t - M.b);

  const path = (k: SeriesKey) => {
    let d = "";
    let pen = false;
    series.forEach((p, i) => {
      const v = p[k];
      if (typeof v !== "number") {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const xTicks = n <= 1 ? [0] : [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (n - 1))))];

  function nearest(e: PointerEvent<SVGRectElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = n <= 1 ? 0 : Math.round(((px - M.l) / (W - M.l - M.r)) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  }

  const point = active !== null ? series[active] : null;

  return (
    <figure aria-labelledby={titleId} className="rounded-2xl border border-space-600 bg-space-800 p-5">
      <figcaption id={titleId} className="font-display text-lg font-bold">
        Detecções por dia
        <span className="ml-2 text-small font-normal text-ink-300">(detecções/dia)</span>
      </figcaption>

      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-small" aria-label="Legenda do gráfico">
        {keys.map((k) => (
          <li key={k} className="flex items-center gap-2">
            <svg width="26" height="10" aria-hidden>
              <line x1="0" x2="26" y1="5" y2="5" stroke={META[k].hex} strokeWidth="2" strokeDasharray={k === "harmonized" ? "5 3" : undefined} />
            </svg>
            <span aria-hidden style={{ color: META[k].hex }}>{META[k].symbol}</span>
            {META[k].label}
            {k === "harmonized" && <span className="text-ink-300">(harmonizado)</span>}
          </li>
        ))}
      </ul>

      <div className="relative mt-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none rounded-lg focus-visible:outline-3 focus-visible:outline-offset-2"
          role="group"
          tabIndex={0}
          aria-label="Gráfico de linhas de detecções por dia. Use as setas esquerda e direita para ler cada dia; há uma tabela equivalente abaixo."
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="var(--space-600)" strokeWidth="1" opacity="0.6" />
              <text x={M.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ink-300)" className="font-mono">
                {fmt(t)}
              </text>
            </g>
          ))}
          {xTicks.map((i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 && n > 1 ? "start" : i === n - 1 && n > 1 ? "end" : "middle"} fontSize="11" fill="var(--ink-300)" className="font-mono">
              {formatShort(series[i].date)}
            </text>
          ))}

          {keys.map((k) => (
            <path key={k} d={path(k)} fill="none" stroke={META[k].hex} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={k === "harmonized" ? "6 4" : undefined} />
          ))}

          {n > 0 &&
            keys.map((k) => {
              const v = series[n - 1][k];
              return typeof v === "number" ? (
                <g key={k}>
                  <circle cx={x(n - 1)} cy={y(v)} r="4" fill={META[k].hex} stroke="var(--space-800)" strokeWidth="2" />
                  <text x={x(n - 1) + 8} y={y(v) + 4} fontSize="11" fill="var(--ink-100)">
                    {META[k].label}
                  </text>
                </g>
              ) : null;
            })}

          {active !== null && point && (
            <g pointerEvents="none">
              <line x1={x(active)} x2={x(active)} y1={M.t} y2={H - M.b} stroke="var(--ink-300)" strokeWidth="1" strokeDasharray="3 3" />
              {keys.map((k) => {
                const v = point[k];
                return typeof v === "number" ? (
                  <circle key={k} cx={x(active)} cy={y(v)} r="5" fill={META[k].hex} stroke="var(--space-800)" strokeWidth="2" />
                ) : null;
              })}
            </g>
          )}

          <rect
            x={M.l}
            y={M.t}
            width={W - M.l - M.r}
            height={H - M.t - M.b}
            fill="transparent"
            onPointerMove={nearest}
            onPointerDown={nearest}
            onPointerLeave={() => setActive(null)}
          />
        </svg>

        {active !== null && point && (
          <div
            role="status"
            className="pointer-events-none absolute left-3 top-2 rounded-lg border border-space-600 bg-space-900/95 px-3 py-2 text-small shadow-xl"
          >
            <p className="font-mono text-ink-300">{formatShort(point.date)}</p>
            {keys.map((k) => (
              <p key={k} className="flex items-center gap-2">
                <span aria-hidden style={{ color: META[k].hex }}>{META[k].symbol}</span>
                {META[k].label}:{" "}
                <span className="font-mono">
                  {typeof point[k] === "number" ? fmt(point[k] as number) : "indisponível"}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>

      <details className="mt-3">
        <summary className="min-h-11 cursor-pointer py-2 text-small font-semibold">
          Ver como tabela
        </summary>
        <div className="max-h-72 overflow-auto rounded-lg border border-space-600">
          <table className="w-full text-small">
            <caption className="sr-only">Detecções por dia e sensor</caption>
            <thead className="sticky top-0 bg-space-900">
              <tr>
                <th scope="col" className="px-3 py-2 text-left">Data</th>
                {keys.map((k) => (
                  <th key={k} scope="col" className="px-3 py-2 text-right">
                    {META[k].symbol} {META[k].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map((p) => (
                <tr key={p.date} className="border-t border-space-600">
                  <th scope="row" className="px-3 py-1.5 text-left font-mono font-normal">{p.date}</th>
                  {keys.map((k) => (
                    <td key={k} className="px-3 py-1.5 text-right font-mono">
                      {typeof p[k] === "number" ? fmt(p[k] as number) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
