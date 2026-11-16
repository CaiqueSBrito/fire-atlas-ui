import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { fetchForecast } from "@/lib/api/forecast";
import { renderWithProviders } from "@/test/render";
import type { ForecastCell, ForecastResponse } from "@/types/forecast";
import { ForecastView } from "./forecast-view";

vi.mock("@/lib/api/forecast", () => ({ fetchForecast: vi.fn() }));
vi.mock("@/features/map/components/fire-map-loader", () => ({
  FireMap: (props: { forecastCells?: ForecastCell[] | null }) => (
    <div data-testid="forecast-map">{props.forecastCells?.length ?? 0} células</div>
  ),
}));
vi.mock("@/lib/utils/webgl", () => ({ supportsWebGL: () => true }));

const forecast = vi.mocked(fetchForecast);

const cell = (over: Partial<ForecastCell>): ForecastCell => ({
  id: "868a9ad97ffffff",
  lat: -10.5,
  lon: -55.5,
  probability: 0.5,
  detections24h: null,
  detections7d: null,
  frpMean7d: null,
  active: null,
  country: null,
  city: null,
  cityDistanceKm: null,
  ...over,
});

const available = (
  over: Partial<Extract<ForecastResponse, { status: "available" }>> = {},
): ForecastResponse => ({
  status: "available",
  issueDate: "2026-11-15",
  summary: { cells: 34791, activeCells: 8360, maxProbability: 0.9854977, meanProbability: 0.034 },
  cells: [
    cell({
      id: "a",
      probability: 0.9854977,
      detections24h: 50,
      detections7d: 359,
      frpMean7d: 23.96,
      active: true,
      country: "Brasil",
      city: "Sinop",
      cityDistanceKm: 12.4,
    }),
    cell({ id: "b", probability: 0.4, active: false }),
  ],
  truncated: true,
  source: "gold/forecast (time de dados)",
  method: "probability7d e a probabilidade de fogo",
  ...over,
});

beforeEach(() => {
  forecast.mockReset();
});

describe("ForecastView (NASA-015)", () => {
  it("mostra carregamento enquanto consulta", () => {
    forecast.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<ForecastView />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("sem previsão do serviço informa indisponibilidade e nenhuma estimativa (RN04)", async () => {
    forecast.mockResolvedValue({ status: "unavailable", reason: "Nenhuma previsao importada." });
    renderWithProviders(<ForecastView />);
    expect(await screen.findByText("Unavailable.")).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma previsao importada\./)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });


  it("indicadores da região usam os totais do serviço, não só as linhas listadas", async () => {
    forecast.mockResolvedValue(available());
    renderWithProviders(<ForecastView />);
    const cards = within(await screen.findByRole("region", { name: "Indicators" }));
    expect(cards.getByText("34,791")).toBeInTheDocument();
    expect(cards.getByText("8,360")).toBeInTheDocument();
    expect(cards.getByText("98.5")).toBeInTheDocument();
    expect(cards.getByText("3.4")).toBeInTheDocument();
  });


  it("mostra as células existentes no mapa e permite abrir e fechar o detalhe", async () => {
    forecast.mockResolvedValue(available());
    renderWithProviders(<ForecastView />);
    expect(await screen.findByTestId("forecast-map")).toHaveTextContent("2 células");
    const choice = screen.getByRole("button", { name: /Sinop.*98.5%/ });
    await userEvent.click(choice);
    expect(choice).toHaveAttribute("aria-pressed", "true");
    const detail = within(screen.getByRole("region", { name: "Sinop (12 km), Brasil" }));
    expect(detail.getByText("98.5%")).toBeInTheDocument();
    expect(detail.getByText("24 MW")).toBeInTheDocument();
    expect(detail.getByText("10.50° S, 55.50° W")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "View entire region" }));
    expect(choice).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("region", { name: "Sinop (12 km), Brasil" })).not.toBeInTheDocument();
  });

  it("limita apenas a tabela a cem linhas sem reduzir as células do mapa", async () => {
    const cells = Array.from({ length: 101 }, (_, i) => cell({ id: String(i) }));
    forecast.mockResolvedValue(available({ cells }));
    renderWithProviders(<ForecastView />);
    expect(await screen.findByTestId("forecast-map")).toHaveTextContent("101 células");
    await userEvent.click(screen.getByText(/View cell table/));
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(101);
  });

  it("região sem células não vira ausência de risco", async () => {
    forecast.mockResolvedValue(
      available({
        summary: { cells: 0, activeCells: 0, maxProbability: null, meanProbability: null },
        cells: [],
        truncated: false,
      }),
    );
    renderWithProviders(<ForecastView />);
    expect(await screen.findByText("No cells with forecasts in this region")).toBeInTheDocument();
    expect(screen.getByText(/does not mean there is no fire risk/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("falha de consulta oferece nova tentativa", async () => {
    forecast.mockRejectedValueOnce(new ApiError("Falha de rede"));
    forecast.mockResolvedValueOnce(available());
    renderWithProviders(<ForecastView />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha de rede");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Fire risk map" })).toBeInTheDocument();
  });

  it("consulta a área da região escolhida nos filtros", async () => {
    forecast.mockResolvedValue({ status: "unavailable", reason: "x" });
    renderWithProviders(<ForecastView />, { searchParams: "?region=brasil" });
    await screen.findByText("Unavailable.");
    expect(forecast.mock.calls[0][0]).toEqual([-74, -34, -34, 6]);
    expect(screen.getByText(/Fire risk report for Brazil/)).toBeInTheDocument();
  });
});
