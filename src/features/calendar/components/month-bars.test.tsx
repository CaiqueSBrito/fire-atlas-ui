import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ActivityDay, TemperatureBin } from "@/types/calendar";
import { MonthBars } from "./month-bars";

const bins = (values: number[]): TemperatureBin[] =>
  (
    [
      ["lt320", null, 320],
      ["320", 320, 330],
      ["330", 330, 340],
      ["340", 340, 350],
      ["350", 350, 360],
      ["ge360", 360, null],
      ["none", null, null],
    ] as const
  ).map(([key, fromK, toK], i) => ({ key, fromK, toK, value: values[i] }));

const day = (date: string, patch: Partial<ActivityDay> = {}): ActivityDay => ({
  date,
  status: "activity",
  value: 100,
  contributing: 2,
  basis: "viirs",
  temperature: null,
  ...patch,
});

const DAYS: ActivityDay[] = [
  day("2026-11-01", { value: 200, temperature: bins([10, 40, 80, 40, 20, 10, 0]) }),
  day("2026-11-02", { value: 50, temperature: bins([5, 10, 15, 10, 5, 5, 0]) }),
  day("2026-11-03", { status: "none", value: 0 }),
  day("2026-11-04", { status: "unavailable", value: null, contributing: 0, basis: null }),
];

function setup(days = DAYS, selected: string | null = "2026-11-01") {
  const onSelect = vi.fn();
  render(<MonthBars title="Atividade em novembro" days={days} selected={selected} today="2026-11-04" onSelect={onSelect} />);
  return { onSelect };
}

const bar = (name: RegExp) => screen.getByRole("button", { name });

describe("MonthBars", () => {


  it("clicar escolhe o dia; o escolhido fica marcado", async () => {
    const { onSelect } = setup();
    expect(bar(/November 1/)).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(bar(/November 2/));
    expect(onSelect).toHaveBeenCalledWith("2026-11-02");
  });
});
