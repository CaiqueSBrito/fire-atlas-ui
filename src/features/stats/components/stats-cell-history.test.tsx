import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiClient from "@/lib/api/client";
import { fetchCellHistory, fetchStats } from "@/lib/api/detections";
import { statsResponse } from "@/test/detection-fixtures";
import { renderWithProviders } from "@/test/render";
import type { CellHistory } from "@/types/stats";
import { StatsDashboard } from "./stats-dashboard";

vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof ApiClient>()),
  hasApi: true,
}));
vi.mock("@/lib/api/detections", () => ({
  fetchDetections: vi.fn(),
  fetchStats: vi.fn(),
  fetchCellHistory: vi.fn(),
}));
vi.mock("@/lib/api/activity", () => ({
  fetchHarmonizedMonthly: vi.fn().mockResolvedValue({ months: [], unitLabel: "atividade", warnings: [] }),
}));

const FIRST_CELL = "838141fffffffff";
const SECOND_CELL = "835f23fffffffff";

beforeEach(() => {
  vi.mocked(fetchStats).mockReset();
  vi.mocked(fetchCellHistory).mockReset();
  vi.mocked(fetchStats).mockResolvedValue(statsResponse({
    ranking: {
      criterion: "Contagem",
      rule: "Decrescente",
      unit: "detections",
      items: [
        { h3: FIRST_CELL, label: "Cell A", value: 120 },
        { h3: SECOND_CELL, label: "Cell B", value: 100 },
      ],
    },
  }));
  vi.mocked(fetchCellHistory).mockImplementation(async (cell): Promise<CellHistory> => ({
    cell,
    start: "2026-11-01",
    end: "2026-11-13",
    days: 13,
    current: { year: 2026, detections: cell === FIRST_CELL ? 120 : 100 },
    years: [{ year: 2025, detections: 50 }],
    currentPerDay: 10,
    meanPerDay: null,
    changePct: null,
    anomalousSensors: [],
    sufficient: false,
    yearsWithData: 1,
    minYears: 3,
    yearsRequested: 5,
    notes: [],
  }));
});

describe("histórico por seleção do ranking", () => {
  it("consulta a primeira célula e muda os anos exibidos ao escolher outra por teclado", async () => {
    renderWithProviders(<StatsDashboard />, {
      searchParams: "?region=brasil&sensors=modis&from=2026-11-01&to=2026-11-13",
    });
    const history = await screen.findByRole("region", { name: "Historical comparison" });
    expect(await within(history).findByText(FIRST_CELL)).toBeInTheDocument();
    const ranking = screen.getByRole("region", { name: "Location ranking" });
    const [first, second] = within(ranking).getAllByRole("button");
    expect(first).toHaveAttribute("aria-pressed", "true");
    second.focus();
    await userEvent.keyboard("{Enter}");
    expect(await within(history).findByText(SECOND_CELL)).toBeInTheDocument();
    expect(within(history).queryByText(FIRST_CELL)).not.toBeInTheDocument();
    expect(second).toHaveAttribute("aria-pressed", "true");
    expect(vi.mocked(fetchCellHistory).mock.calls.map(([cell, to, sensors]) => ({ cell, to, sensors })))
      .toEqual([
        { cell: FIRST_CELL, to: "2026-11-13", sensors: ["modis"] },
        { cell: SECOND_CELL, to: "2026-11-13", sensors: ["modis"] },
      ]);
  });
});
