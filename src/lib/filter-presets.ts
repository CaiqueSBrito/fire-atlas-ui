import { formatShort, shiftDate } from "@/lib/utils/dates";

export type PeriodPresetId = "7d" | "30d" | "month" | "year" | "custom";

export const PERIOD_PRESETS: ReadonlyArray<{ id: Exclude<PeriodPresetId, "custom">; label: string }> = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
];

export type Period = { from: string | null; to: string | null };

export function presetPeriod(id: Exclude<PeriodPresetId, "custom">, today: string): Period {
  switch (id) {
    case "7d":
      return { from: null, to: null };
    case "30d":
      return { from: shiftDate(today, -29), to: null };
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: null };
    case "year":
      return { from: `${today.slice(0, 4)}-01-01`, to: null };
  }
}

export function detectPreset(period: Period, today: string): PeriodPresetId {
  const to = period.to ?? today;
  if (to !== today) return "custom";
  for (const preset of PERIOD_PRESETS) {
    if (presetPeriod(preset.id, today).from === period.from) return preset.id;
  }
  return "custom";
}

export function formatPeriod(from: string, to: string): string {
  return from === to ? formatShort(from) : `${formatShort(from)} → ${formatShort(to)}`;
}
