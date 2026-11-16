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
        <strong>FORECAST — not observed detections.</strong> Probability of fire in the next 7 days,
        issued {new Date(`${issueDate}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC" })}.
        {truncated && ` Showing the ${cells.length.toLocaleString("en-US")} highest-probability cells.`}
      </p>
      <h2 id="forecast-list-title" className="text-small font-semibold tracking-[-0.02em] text-ink-300">
        Highest probabilities in the visible area
      </h2>
      {top.length === 0 ? (
        <p className="text-caption text-ink-300">No forecast cells in this area.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {top.map((c) => (
            <li
              key={c.id}
              className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-space-600 px-3 text-small"
            >
              <span className="font-mono font-semibold text-[#ff5a4f]">{pct(c.probability)}</span>
              <span className="truncate text-ink-100">
                {c.city ? `near ${c.city}` : `${c.lat.toFixed(1)}°, ${c.lon.toFixed(1)}°`}
                {c.country ? ` · ${c.country}` : ""}
              </span>
              {c.active && (
                <span className="ml-auto shrink-0 rounded-full border border-ember-400/60 px-2 text-caption text-ember-400">
                  recent fire
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
