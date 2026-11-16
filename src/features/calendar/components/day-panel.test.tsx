import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ActivityDay } from "@/types/calendar";
import { DayPanel } from "./day-panel";

const UNIT = "Atividade de fogo harmonizada (MODIS Aqua-equivalent active cells)";

const base: ActivityDay = {
  date: "2026-11-13",
  status: "activity",
  value: 200,
  contributing: 2,
  basis: "viirs",
  temperature: [
    { key: "lt320", fromK: null, toK: 320, value: 20 },
    { key: "330", fromK: 330, toK: 340, value: 150 },
    { key: "ge360", fromK: 360, toK: null, value: 30 },
  ],
};

function setup(day: ActivityDay | null, canGoNext = true) {
  render(
    <DayPanel
      day={day}
      unitLabel={UNIT}
      satellites={{ date: "2026-11-13", contributing: ["NOAA-20", "NOAA-21"], available: [] }}
      canGoNext={canGoNext}
      onPrev={vi.fn()}
      onNext={vi.fn()}
    />,
  );
}

describe("DayPanel", () => {

  it("não deixa avançar além de hoje", () => {
    setup(base, false);
    expect(screen.getByRole("button", { name: "Next ›" })).toBeDisabled();
  });
});
