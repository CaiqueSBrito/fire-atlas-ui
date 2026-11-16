import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchActivityMonth, fetchDaySatellites, fetchMonthAnomaly } from "@/lib/api/activity";
import { ApiError } from "@/lib/api/client";
import { fetchCoverage } from "@/lib/api/coverage";
import type * as ApiClient from "@/lib/api/client";
import type * as CoverageApi from "@/lib/api/coverage";
import { renderWithProviders } from "@/test/render";
import type { ActivityDay, ActivityMonth } from "@/types/calendar";
import { CalendarView } from "./calendar-view";

vi.mock("@/lib/api/activity", () => ({
  fetchActivityMonth: vi.fn(),
  fetchMonthAnomaly: vi.fn(),
  fetchDaySatellites: vi.fn(),
}));
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof ApiClient>()),
  hasApi: true,
}));
vi.mock("@/lib/api/coverage", async (original) => ({
  ...(await original<typeof CoverageApi>()),
  fetchCoverage: vi.fn(),
}));
vi.mock("./day-map", () => ({
  DayMap: (p: { date: string; region: { id: string }; viewBbox?: number[] | null }) => (
    <div data-testid="day-map" data-date={p.date} data-region={p.region.id} data-view={p.viewBbox?.join(",") ?? ""} />
  ),
}));

const month = vi.mocked(fetchActivityMonth);
const anomaly = vi.mocked(fetchMonthAnomaly);
const satellites = vi.mocked(fetchDaySatellites);

const day = (date: string, value: number | null): ActivityDay => ({
  date,
  status: value === null ? "unavailable" : value > 0 ? "activity" : "none",
  value,
  contributing: value === null ? 0 : 2,
  basis: value === null ? null : "viirs",
  temperature: null,
});

function monthOf(m: string, values: (number | null)[], region = "world"): ActivityMonth {
  return {
    month: m,
    region,
    days: values.map((v, i) => day(`${m}-${String(i + 1).padStart(2, "0")}`, v)),
    unitLabel: "Atividade de fogo harmonizada (MODIS Aqua-equivalent active cells)",
    warnings: ["O dia é o dia local de fogo, não UTC."],
    source: { name: "teste", simulated: false },
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-04T12:00:00Z"));
  month.mockReset();
  anomaly.mockReset();
  satellites.mockReset();
  vi.mocked(fetchCoverage).mockResolvedValue({ resolutions: [0, 1, 2, 3, 4, 5], minDate: "2000-11-01", maxDate: "2026-11-13" });
  month.mockImplementation(async (m, region) => monthOf(m, [100, 200, 50, null], region));
  anomaly.mockResolvedValue({
    sufficient: false, current: null, baselineMedian: null, deviationPct: null, yearsWithData: 0, minYears: 3, note: null,
  });
  satellites.mockResolvedValue({ date: "", contributing: ["NOAA-20"], available: [] });
});

afterEach(() => {
  vi.useRealTimers();
  sessionStorage.clear();
});

const heading = () => screen.findByRole("heading", { level: 2, name: /^November \d+, 2026$/ });

describe("CalendarView", () => {
  it("sem data na URL abre o último dia com dado do mês (hoje está no data)", async () => {
    renderWithProviders(<CalendarView />);
    expect(await heading()).toHaveTextContent("November 3, 2026");
    expect(screen.getByTestId("day-map")).toHaveAttribute("data-date", "2026-11-03");
  });
  it("abre o último dia com atividade e grade espacial sem substituir uma data explícita", async () => {
    vi.mocked(fetchCoverage).mockResolvedValue({ resolutions: [0, 1, 2, 3, 4, 5], minDate: "2000-11-01", maxDate: "2026-11-02" });
    renderWithProviders(<CalendarView />);
    expect(await heading()).toHaveTextContent("November 2, 2026");
    await userEvent.click(screen.getByRole("button", { name: /^November 3, 2026/ }));
    expect(await heading()).toHaveTextContent("November 3, 2026");
  });

  it("escolher uma barra grava a data na URL e troca mapa e painel", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<CalendarView />, { onUrlUpdate });
    await heading();
    await userEvent.click(screen.getByRole("button", { name: /^November 2, 2026/ }));
    expect(await heading()).toHaveTextContent("November 2, 2026");
    expect(screen.getByTestId("day-map")).toHaveAttribute("data-date", "2026-11-02");
    expect(onUrlUpdate.mock.calls.at(-1)![0].queryString).toContain("date=2026-11-02");
  });

  it("escolher um dia no calendário troca mapa, painel e URL", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<CalendarView />, { onUrlUpdate });
    await heading();
    await userEvent.click(screen.getByRole("button", { name: /November 2026 — choose day/ }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "November 2, 2026" }));
    expect(await heading()).toHaveTextContent("November 2, 2026");
    expect(screen.getByTestId("day-map")).toHaveAttribute("data-date", "2026-11-02");
    expect(onUrlUpdate.mock.calls.at(-1)![0].queryString).toContain("date=2026-11-02");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("trocar o mês pelo seletor de dia atualiza a consulta, o mapa e a URL", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<CalendarView />, { searchParams: "?date=2026-11-02", onUrlUpdate });
    await heading();
    expect(screen.queryByRole("button", { name: "Previous month" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next month" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /November 2026 — choose day/ }));
    const picker = within(screen.getByRole("dialog"));
    await userEvent.click(picker.getByRole("button", { name: "Previous month" }));
    await userEvent.click(picker.getByRole("button", { name: "October 2, 2026" }));
    await waitFor(() => expect(month).toHaveBeenLastCalledWith("2026-10", "world", expect.anything()));
    expect(await screen.findByRole("heading", { level: 2, name: "October 2, 2026" })).toBeInTheDocument();
    expect(screen.getByTestId("day-map")).toHaveAttribute("data-date", "2026-10-02");
    const qs = onUrlUpdate.mock.calls.at(-1)![0].queryString;
    expect(qs).toContain("month=2026-10");
    expect(qs).toContain("date=2026-10-02");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("dia no data escolhido mostra o aviso e não consulta satélites", async () => {
    renderWithProviders(<CalendarView />, { searchParams: "?date=2026-11-04" });
    expect(await heading()).toHaveTextContent("November 4, 2026");
    expect(screen.getByText(/This does not mean there was no fire/)).toBeInTheDocument();
    expect(satellites).not.toHaveBeenCalled();
  });


  it("falha ao carregar o mês informa o motivo e tenta de novo", async () => {
    month.mockRejectedValueOnce(new ApiError("Serviço fora do ar"));
    renderWithProviders(<CalendarView />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Serviço fora do ar");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await heading()).toHaveTextContent("November 3, 2026");
  });

  it("não oferece repetir uma operação que a API não implementa", async () => {
    month.mockRejectedValue(new ApiError("Recurso indisponível", 501, false));
    renderWithProviders(<CalendarView />);
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("o mapa do dia abre no lugar escolhido no mapa principal da mesma região", async () => {
    sessionStorage.setItem("fire-atlas:map-place", "south-america|-56,-12,-54,-10");
    renderWithProviders(<CalendarView />, { searchParams: "region=south-america" });
    await heading();
    expect(screen.getByTestId("day-map")).toHaveAttribute("data-view", "-56,-12,-54,-10");
  });

  it("uma área explícita na URL tem prioridade sobre o lugar lembrado", async () => {
    sessionStorage.setItem("fire-atlas:map-place", "world|-56,-12,-54,-10");
    renderWithProviders(<CalendarView />, { searchParams: "bbox=-50,-10,-40,0" });
    await heading();
    expect(screen.getByTestId("day-map")).toHaveAttribute("data-view", "-50,-10,-40,0");
  });

  it("não leva o lugar lembrado para outra região", async () => {
    sessionStorage.setItem("fire-atlas:map-place", "south-america|-56,-12,-54,-10");
    renderWithProviders(<CalendarView />, { searchParams: "region=africa" });
    await heading();
    expect(screen.getByTestId("day-map")).toHaveAttribute("data-view", "");
  });
});
