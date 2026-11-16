import { cn } from "@/lib/utils/cn";
import { dayNumber, formatLong } from "@/lib/utils/dates";
import type { ActivityDay } from "@/types/calendar";
import {
  NO_BINS_COLOR,
  binColor,
  binLabel,
  formatActivity,
  stackOrder,
} from "../temperature";

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

function dayLabel(day: ActivityDay, isToday: boolean): string {
  const when = `${formatLong(day.date)}${isToday ? " (today)" : ""}`;
  if (day.status === "unavailable") return `${when}: no data`;
  const parts = [`${when}: harmonized activity ${formatActivity(day.value ?? 0)}`];
  if (day.temperature) {
    parts.push(
      stackOrder(day.temperature)
        .filter((b) => b.value > 0)
        .reverse()
        .map((b) => `${binLabel(b)} ${formatActivity(b.value)}`)
        .join(", "),
    );
  }
  return parts.join("; ");
}

export function MonthBars({
  title,
  days,
  selected,
  today,
  onSelect,
}: {
  title: string;
  days: ActivityDay[];
  selected: string | null;
  today: string;
  onSelect: (date: string) => void;
}) {
  const max = Math.max(0, ...days.map((d) => d.value ?? 0));
  const legendBins = days.find((d) => d.temperature)?.temperature;
  const someWithoutBins = days.some((d) => d.status === "activity" && !d.temperature);

  return (
    <section
      aria-labelledby="month-bars-title"
      className="rounded-panel border border-space-600 bg-space-800 p-6"
    >
      <h2 id="month-bars-title" className="font-display type-heading-section">
        {title}
      </h2>
      <p className="mt-1 type-body-small text-ink-300">
        Click a day to see the map and details. Each color is a brightness temperature band.
      </p>
      <ul
        aria-label="Bar legend"
        className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-mono type-caption text-ink-300"
      >
          {legendBins &&
            stackOrder(legendBins)
              .reverse()
              .map((b) => (
                <li key={b.key} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-3 rounded-[3px]"
                    style={{ background: binColor(b.key) }}
                  />
                  {binLabel(b)}
                </li>
              ))}
          {someWithoutBins && (
            <li className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 rounded-[3px]"
                style={{ background: NO_BINS_COLOR }}
              />
              Total (no temperature bands)
            </li>
          )}
          <li className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-2.5 rounded-[2px] border border-dashed border-ink-300"
            />
            no data (does not mean there was no fire)
          </li>
        </ul>

      <div className="-mx-1 overflow-x-auto px-1 pt-12">
        <ol className="flex h-48 min-w-[40rem] items-end gap-1 lg:min-w-0">
        {days.map((day) => {
          const isSelected = day.date === selected;
          const isToday = day.date === today;
          const height = max > 0 && day.value ? Math.max(3, (day.value / max) * 100) : 0;
          return (
            <li key={day.date} className="relative flex h-full min-w-0 flex-1 flex-col items-center">
              {isSelected && day.value !== null && (
                <span className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-space-600 bg-space-950 px-3 py-1 font-mono text-[11px] text-ink-100">
                  {Number(dayNumber(day.date))} · {formatActivity(day.value)}
                </span>
              )}
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={dayLabel(day, isToday)}
                onClick={() => onSelect(day.date)}
                className="group flex h-full w-full flex-col items-center justify-end rounded-md outline-offset-2"
              >
                <span
                  className={cn(
                    "flex w-full max-w-[22px] flex-1 flex-col justify-end rounded-[4px]",
                    isSelected
                      ? "ring-2 ring-ember-400 ring-offset-2 ring-offset-space-800"
                      : "group-hover:ring-1 group-hover:ring-ink-300",
                  )}
                >
                  {day.status === "unavailable" ? (
                    <span className="flex h-[18%] items-center justify-center rounded-[4px] border border-dashed border-ink-300/60 font-mono text-[10px] text-ink-300">
                      –
                    </span>
                  ) : day.status === "none" ? (
                    <span className="h-[3px] rounded-full bg-ink-300/60" />
                  ) : (
                    <span
                      className="flex w-full flex-col-reverse gap-px overflow-hidden rounded-[4px]"
                      style={{ height: `${height}%` }}
                    >
                      {day.temperature ? (
                        stackOrder(day.temperature)
                          .filter((b) => b.value > 0)
                          .map((b) => (
                            <span
                              key={b.key}
                              className="block w-full"
                              style={{
                                flexGrow: b.value,
                                flexBasis: 0,
                                background: binColor(b.key),
                              }}
                            />
                          ))
                      ) : (
                        <span className="block h-full w-full" style={{ background: NO_BINS_COLOR }} />
                      )}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "mt-2 font-mono text-[11px]",
                    isSelected
                      ? "font-bold text-ember-400"
                      : isToday
                        ? "font-bold text-focus-ring"
                        : "text-ink-100",
                  )}
                >
                  {dayNumber(day.date)}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "font-mono text-[10px]",
                    isSelected ? "text-ember-400" : isToday ? "font-bold text-focus-ring" : "text-ink-300",
                  )}
                >
                  {isToday ? "today" : WEEKDAY[new Date(`${day.date}T00:00:00Z`).getUTCDay()]}
                </span>
              </button>
            </li>
          );
        })}
        </ol>
      </div>
    </section>
  );
}
