import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { fetchForecast } from "@/lib/api/forecast";
import { renderWithProviders } from "@/test/render";
import type { ForecastCell, ForecastResponse } from "@/types/forecast";
import { ForecastView } from "./forecast-view";

vi.mock("@/lib/api/forecast", () => ({ fetchForecast: vi.fn() }));

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
    expect(screen.getByRole("status")).toHaveTextContent("Consultando previsões…");
  });

  it("sem previsão do serviço informa indisponibilidade e nenhuma estimativa (RN04)", async () => {
    forecast.mockResolvedValue({ status: "unavailable", reason: "Nenhuma previsao importada." });
    renderWithProviders(<ForecastView />);
    expect(await screen.findByText("Indisponível.")).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma previsao importada\./)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("deixa claro que é previsão, não detecção observada (RN02)", async () => {
    forecast.mockResolvedValue(available());
    renderWithProviders(<ForecastView />);
    expect(await screen.findByRole("note")).toHaveTextContent(/PREVISÃO — não são detecções observadas/);
  });

  it("indicadores da região usam os totais do serviço, não só as linhas listadas", async () => {
    forecast.mockResolvedValue(available());
    renderWithProviders(<ForecastView />);
    const cards = within(await screen.findByRole("region", { name: "Indicadores" }));
    expect(cards.getByText("34.791")).toBeInTheDocument();
    expect(cards.getByText("8.360")).toBeInTheDocument();
    expect(cards.getByText("98,5")).toBeInTheDocument();
    expect(cards.getByText("3,4")).toBeInTheDocument();
  });

  it("lista as células em ordem com localidade, unidades e ausência como traço", async () => {
    forecast.mockResolvedValue(available());
    renderWithProviders(<ForecastView />);
    const rows = within(await screen.findByRole("table")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Sinop (12 km), Brasil");
    expect(rows[0]).toHaveTextContent("98,5%");
    expect(rows[0]).toHaveTextContent("10,50° S, 55,50° O");
    expect(rows[0]).toHaveTextContent("Sim");
    expect(rows[1]).toHaveTextContent("Sem localidade registrada");
    expect(rows[1]).toHaveTextContent("40,0%");
    expect(rows[1]).toHaveTextContent("Não");
    expect(within(rows[1]).getAllByText("—")).toHaveLength(3);
    expect(screen.getByText(/As 2 de maior probabilidade entre 34\.791 células/)).toBeInTheDocument();
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
    expect(await screen.findByText("Nenhuma célula com previsão nesta região")).toBeInTheDocument();
    expect(screen.getByText(/não significa ausência de risco/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("falha de consulta oferece nova tentativa", async () => {
    forecast.mockRejectedValueOnce(new ApiError("Falha de rede"));
    forecast.mockResolvedValueOnce(available());
    renderWithProviders(<ForecastView />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha de rede");
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });

  it("consulta a área da região escolhida nos filtros", async () => {
    forecast.mockResolvedValue({ status: "unavailable", reason: "x" });
    renderWithProviders(<ForecastView />, { searchParams: "?region=brasil" });
    await screen.findByText("Indisponível.");
    expect(forecast.mock.calls[0][0]).toEqual([-74, -34, -34, 6]);
    expect(screen.getByText(/Relatório de risco de fogo para Brasil/)).toBeInTheDocument();
  });
});
