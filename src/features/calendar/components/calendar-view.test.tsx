import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchActivityMonth, fetchDaySatellites, fetchMonthAnomaly } from "@/lib/api/activity";
import { ApiError } from "@/lib/api/client";
import { renderWithProviders } from "@/test/render";
import type { ActivityDay, ActivityMonth } from "@/types/calendar";
import { CalendarView } from "./calendar-view";

vi.mock("@/lib/api/activity", () => ({
  fetchActivityMonth: vi.fn(),
  fetchMonthAnomaly: vi.fn(),
  fetchDaySatellites: vi.fn(),
}));
vi.mock("./day-map", () => ({
  DayMap: (p: { date: string; region: { id: string }; viewBbox?: number[] | null }) => (
    <div
      data-testid="day-map"
      data-date={p.date}
      data-region={p.region.id}
      data-view={p.viewBbox ? p.viewBbox.join(",") : ""}
    />
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
    unitLabel: "Atividade de fogo harmonizada (células ativas equivalentes ao MODIS Aqua)",
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

const heading = () => screen.findByRole("heading", { level: 2, name: /de novembro de 2026/ });

describe("CalendarView", () => {
  it("sem data na URL abre o último dia com dado do mês (hoje está sem dado)", async () => {
    renderWithProviders(<CalendarView />);
    expect(await heading()).toHaveTextContent("3 de novembro de 2026");
    expect(screen.getByTestId("day-map")).toHaveAttribute("data-date", "2026-11-03");
  });

  it("escolher uma barra grava a data na URL e troca mapa e painel", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<CalendarView />, { onUrlUpdate });
    await heading();
    await userEvent.click(screen.getByRole("button", { name: /^2 de novembro de 2026/ }));
    expect(await heading()).toHaveTextContent("2 de novembro de 2026");
    expect(screen.getByTestId("day-map")).toHaveAttribute("data-date", "2026-11-02");
    expect(onUrlUpdate.mock.calls.at(-1)![0].queryString).toContain("date=2026-11-02");
  });

  it("trocar a região consulta a nova região e descarta a área desenhada", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<CalendarView />, { searchParams: "?bbox=-50,-10,-40,0", onUrlUpdate });
    await heading();
    await userEvent.click(screen.getByRole("button", { name: "América do Sul" }));
    await waitFor(() => expect(month).toHaveBeenLastCalledWith("2026-11", "south-america", expect.anything()));
    const qs = onUrlUpdate.mock.calls.at(-1)![0].queryString;
    expect(qs).toContain("region=south-america");
    expect(qs).not.toContain("bbox");
    expect(screen.getByRole("button", { name: "América do Sul" })).toHaveAttribute("aria-pressed", "true");
  });

  it("mudar de mês consulta o novo mês e limpa a data escolhida", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<CalendarView />, { searchParams: "?date=2026-11-02", onUrlUpdate });
    await heading();
    await userEvent.click(screen.getByRole("button", { name: "Mês anterior" }));
    await waitFor(() => expect(month).toHaveBeenLastCalledWith("2026-10", "world", expect.anything()));
    const qs = onUrlUpdate.mock.calls.at(-1)![0].queryString;
    expect(qs).toContain("month=2026-10");
    expect(qs).not.toContain("date=");
  });

  it("dia sem dado escolhido mostra o aviso e não consulta satélites", async () => {
    renderWithProviders(<CalendarView />, { searchParams: "?date=2026-11-04" });
    expect(await heading()).toHaveTextContent("4 de novembro de 2026");
    expect(screen.getByText(/Isso não significa ausência de fogo/)).toBeInTheDocument();
    expect(satellites).not.toHaveBeenCalled();
  });

  it("resumo do mês: pico, dias sem dado e comparação indisponível com o motivo", async () => {
    renderWithProviders(<CalendarView />);
    await heading();
    expect(screen.getByText("02/11 · 200")).toBeInTheDocument();
    expect(screen.getByText("Indisponível")).toBeInTheDocument();
    expect(screen.getByText(/exige pelo menos 3 anos anteriores com dado; há 0/)).toBeInTheDocument();
  });

  it("falha ao carregar o mês informa o motivo e tenta de novo", async () => {
    month.mockRejectedValueOnce(new ApiError("Serviço fora do ar"));
    renderWithProviders(<CalendarView />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Serviço fora do ar");
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await heading()).toHaveTextContent("3 de novembro de 2026");
  });

  it("não oferece repetir uma operação que a API não implementa", async () => {
    month.mockRejectedValue(new ApiError("Recurso indisponível", 501, false));
    renderWithProviders(<CalendarView />);
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Tentar novamente" })).not.toBeInTheDocument();
  });

  it("o mapa do dia abre no lugar escolhido no mapa principal (mesma região)", async () => {
    sessionStorage.setItem("fire-atlas:map-place", "south-america|-56,-12,-54,-10");
    renderWithProviders(<CalendarView />, { searchParams: "region=south-america" });
    await heading();
    expect(screen.getByTestId("day-map")).toHaveAttribute("data-view", "-56,-12,-54,-10");
  });

  it("lugar lembrado de outra região não é usado; bbox da URL tem prioridade", async () => {
    sessionStorage.setItem("fire-atlas:map-place", "africa|10,0,20,10");
    const { unmount } = renderWithProviders(<CalendarView />, { searchParams: "region=south-america" });
    await heading();
    expect(screen.getByTestId("day-map")).toHaveAttribute("data-view", "");
    unmount();
    sessionStorage.setItem("fire-atlas:map-place", "south-america|-56,-12,-54,-10");
    renderWithProviders(<CalendarView />, { searchParams: "region=south-america&bbox=-50,-20,-45,-15" });
    await heading();
    expect(screen.getByTestId("day-map")).toHaveAttribute("data-view", "-50,-20,-45,-15");
  });
});
