"use client";

import { useId } from "react";
import { ErrorState } from "@/components/feedback/error-state";
import { HARMONIZED_META } from "@/lib/sensors";
import { monthShortName } from "@/lib/utils/dates";
import type { HarmonizedMonth, HarmonizedMonthly } from "@/types/stats";
import { Unavailable } from "./unavailable";

const W = 760;
const H = 240;
const M = { l: 56, r: 12, t: 16, b: 34 };
const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}

export function monthLabel(month: string): string {
  return `${monthShortName(Number(month.slice(5, 7)) - 1)}/${month.slice(2, 4)}`;
}

function describe(m: HarmonizedMonth): string {
  if (m.value === null) return "sem dado";
  const days = `${m.daysWithData} de ${m.daysInMonth} dias com dado`;
  return `${fmt(m.value)} (${days}${m.complete ? "" : ", mês em andamento"})`;
}

function Chart({ months }: { months: HarmonizedMonth[] }) {
  const max = niceMax(Math.max(0, ...months.map((m) => m.value ?? 0)));
  const slot = (W - M.l - M.r) / months.length;
  const barW = Math.max(6, slot * 0.62);
  const y = (v: number) => H - M.b - (v / max) * (H - M.t - M.b);
  const ticks = [0, 0.5, 1].map((f) => f * max);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-3 w-full"
      role="img"
      aria-label="Gráfico de barras da atividade harmonizada por mês; a tabela abaixo traz os mesmos valores."
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="var(--space-600)" strokeWidth="1" opacity="0.6" />
          <text x={M.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ink-300)" className="font-mono">
            {fmt(t)}
          </text>
        </g>
      ))}
      {months.map((m, i) => {
        const x = M.l + i * slot + (slot - barW) / 2;
        const base = H - M.b;
        return (
          <g key={m.month} data-month={m.month}>
            <title>{`${monthLabel(m.month)}: ${describe(m)}`}</title>
            {m.value === null ? (
              <rect
                x={x}
                y={base - 14}
                width={barW}
                height={14}
                fill="none"
                stroke="var(--ink-300)"
                strokeDasharray="3 3"
                rx="3"
              />
            ) : (
              <rect
                x={x}
                y={y(m.value)}
                width={barW}
                height={Math.max(1, base - y(m.value))}
                fill={HARMONIZED_META.hex}
                opacity={m.complete ? 1 : 0.5}
                stroke={m.complete ? "none" : HARMONIZED_META.hex}
                strokeDasharray={m.complete ? undefined : "4 3"}
                rx="3"
              />
            )}
            <text
              x={x + barW / 2}
              y={H - 12}
              textAnchor="middle"
              fontSize="11"
              fill="var(--ink-300)"
              className="font-mono"
            >
              {monthLabel(m.month)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function HarmonizedMonthlyPanel({
  data,
  isPending,
  error,
  onRetry,
}: {
  data: HarmonizedMonthly | null | undefined;
  isPending: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const titleId = useId();
  if (data === null) return null;

  let body: React.ReactNode;
  if (error) {
    body = (
      <ErrorState
        title="Não foi possível carregar a atividade harmonizada"
        message={error.message}
        onRetry={onRetry}
      />
    );
  } else if (isPending || !data) {
    body = (
      <div role="status" className="mt-3 h-48 animate-pulse rounded-xl bg-space-900">
        <span className="sr-only">Carregando a atividade harmonizada…</span>
      </div>
    );
  } else if (data.months.every((m) => m.value === null)) {
    body = (
      <div className="mt-3">
        <Unavailable>
          Sem dado harmonizado para esta região nos últimos {data.months.length} meses. Falta de dado não
          significa ausência de fogo.
        </Unavailable>
      </div>
    );
  } else {
    body = (
      <>
        <Chart months={data.months} />
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-caption text-ink-300" aria-label="Legenda">
          <li className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-3 w-3 rounded-sm" style={{ background: HARMONIZED_META.hex }} />
            Mês completo
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-sm border border-dashed opacity-60"
              style={{ background: HARMONIZED_META.hex, borderColor: HARMONIZED_META.hex }}
            />
            Mês em andamento
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-3 w-3 rounded-sm border border-dashed border-ink-300" />
            Sem dado
          </li>
        </ul>
        <details className="mt-3 text-small">
          <summary className="cursor-pointer font-semibold text-ink-100">Ver os valores em tabela</summary>
          <table className="mt-2 w-full text-left">
            <thead className="text-caption text-ink-300">
              <tr>
                <th scope="col" className="py-1 font-semibold">Mês</th>
                <th scope="col" className="py-1 font-semibold">Atividade harmonizada</th>
                <th scope="col" className="py-1 font-semibold">Dias com dado</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {data.months.map((m) => (
                <tr key={m.month} className="border-t border-space-600">
                  <th scope="row" className="py-1 font-normal">
                    {monthLabel(m.month)}
                    {!m.complete && <span className="text-ink-300"> (em andamento)</span>}
                  </th>
                  <td className="py-1">{m.value === null ? "sem dado" : fmt(m.value)}</td>
                  <td className="py-1">
                    {m.daysWithData}/{m.daysInMonth}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        {data.warnings.length > 0 && (
          <details className="mt-2 text-caption text-ink-300">
            <summary className="cursor-pointer font-semibold text-ink-100">Avisos de uso</summary>
            <ul className="mt-1 list-disc pl-5">
              {data.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </details>
        )}
      </>
    );
  }

  return (
    <figure aria-labelledby={titleId} className="rounded-2xl border border-space-600 bg-space-800 p-5">
      <figcaption id={titleId}>
        <span className="flex items-center gap-2 font-display text-lg font-bold">
          <span aria-hidden style={{ color: HARMONIZED_META.hex }}>
            {HARMONIZED_META.symbol}
          </span>
          Atividade harmonizada por mês
        </span>
        <span className="mt-1 block text-small text-ink-300">
          MODIS + VIIRS na mesma escala, últimos 12 meses até o fim do período. Unidade:{" "}
          {data?.unitLabel ?? "células ativas equivalentes ao MODIS Aqua"}; não é número de focos.
        </span>
      </figcaption>
      {body}
    </figure>
  );
}
