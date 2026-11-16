"use client";

import { useId } from "react";
import { ErrorState } from "@/components/feedback/error-state";
import { ApiError } from "@/lib/api/client";
import { HARMONIZED_META } from "@/lib/sensors";
import { monthShortName } from "@/lib/utils/dates";
import type { HarmonizedMonth, HarmonizedMonthly } from "@/types/stats";
import { Unavailable } from "./unavailable";

const W = 760;
const H = 240;
const M = { l: 56, r: 12, t: 16, b: 34 };
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}

export function monthLabel(month: string): string {
  return `${monthShortName(Number(month.slice(5, 7)) - 1)}/${month.slice(2, 4)}`;
}

function describe(m: HarmonizedMonth): string {
  if (m.value === null) return "no data";
  const days = `${m.daysWithData} of ${m.daysInMonth} days with data`;
  return `${fmt(m.value)} (${days}${m.complete ? "" : ", month in progress"})`;
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
      aria-label="Monthly harmonized activity bar chart; the table below provides the same values."
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
        title="Could not load harmonized activity"
        message={error.message}
        onRetry={error instanceof ApiError && !error.recoverable ? undefined : onRetry}
      />
    );
  } else if (isPending || !data) {
    body = (
      <div role="status" className="mt-3 h-48 animate-pulse rounded-xl bg-space-900">
        <span className="sr-only">Loading harmonized activity…</span>
      </div>
    );
  } else if (data.months.every((m) => m.value === null)) {
    body = (
      <div className="mt-3">
        <Unavailable>
          No harmonized data for this region in the last {data.months.length} months. Missing data does not
          mean there was no fire.
        </Unavailable>
      </div>
    );
  } else {
    body = (
      <>
        <Chart months={data.months} />
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-caption text-ink-300" aria-label="Legend">
          <li className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-3 w-3 rounded-sm" style={{ background: HARMONIZED_META.hex }} />
            Complete month
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-sm border border-dashed opacity-60"
              style={{ background: HARMONIZED_META.hex, borderColor: HARMONIZED_META.hex }}
            />
            Month in progress
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-3 w-3 rounded-sm border border-dashed border-ink-300" />
            No data
          </li>
        </ul>
        <details className="mt-3 text-small">
          <summary className="cursor-pointer font-semibold text-ink-100">View values in a table</summary>
          <table className="mt-2 w-full text-left">
            <thead className="text-caption text-ink-300">
              <tr>
                <th scope="col" className="py-1 font-semibold">Month</th>
                <th scope="col" className="py-1 font-semibold">Harmonized activity</th>
                <th scope="col" className="py-1 font-semibold">Days with data</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {data.months.map((m) => (
                <tr key={m.month} className="border-t border-space-600">
                  <th scope="row" className="py-1 font-normal">
                    {monthLabel(m.month)}
                    {!m.complete && <span className="text-ink-300"> (in progress)</span>}
                  </th>
                  <td className="py-1">{m.value === null ? "no data" : fmt(m.value)}</td>
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
            <summary className="cursor-pointer font-semibold text-ink-100">Usage notes</summary>
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
          Harmonized activity by month
        </span>
        <span className="mt-1 block text-small text-ink-300">
          MODIS + VIIRS on the same scale, last 12 months through the end of the period. Unit:{" "}
          {data?.unitLabel ?? "MODIS Aqua-equivalent active cells"}; not a count of fire detections.
        </span>
      </figcaption>
      {body}
    </figure>
  );
}
