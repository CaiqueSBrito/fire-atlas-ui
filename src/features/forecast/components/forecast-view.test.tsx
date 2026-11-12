import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { fetchDetections } from "@/lib/api/detections";
import { fetchForecast } from "@/lib/api/forecast";
import { detectionsResponse } from "@/test/detection-fixtures";
import { renderWithProviders } from "@/test/render";
import type { ForecastResponse } from "@/types/forecast";
import { ForecastView } from "./forecast-view";

vi.mock("@/lib/api/forecast", () => ({ fetchForecast: vi.fn() }));
vi.mock("@/lib/api/detections", () => ({
  fetchDetections: vi.fn(),
  fetchStats: vi.fn(),
}));
vi.mock("@/features/map/components/fire-map-loader", () => ({
  FireMap: (p: { detections: unknown[]; forecastAreas?: unknown[] }) => (
    <div
      data-testid="fire-map"
      data-observed={p.detections.length}
      data-forecast={p.forecastAreas?.length ?? 0}
    />
  ),
}));

const forecast = vi.mocked(fetchForecast);

const available = (over: Record<string, unknown> = {}): ForecastResponse => ({
  status: "available",
  model: { name: "Modelo X", version: "1.2" },
  region: "Brasil",
  horizon: { from: "2026-11-13", to: "2026-11-20" },
  areas: [
    {
      id: "a1",
      label: "Área Norte",
      bbox: [-60, -10, -50, 0],
      frpPredicted: { value: 55.5, unit: "MW" },
      confidence: { metric: "Probabilidade", value: 0.82 },
    },
    { id: "a2", label: "Área Sul", bbox: [-50, -20, -40, -10] },
  ],
  limitations: ["Baixa resolução espacial", "Não considera queimadas planejadas"],
  ...over,
}) as ForecastResponse;

beforeEach(() => {
  forecast.mockReset();
  vi.mocked(fetchDetections).mockReset();
  vi.mocked(fetchDetections).mockResolvedValue(detectionsResponse());
});

describe("ForecastView (NASA-015)", () => {
  it("mostra carregamento enquanto consulta", () => {
    forecast.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<ForecastView />);
    expect(screen.getByRole("status")).toHaveTextContent("Consultando previsões…");
  });

  it("sem previsão válida informa indisponibilidade e nenhuma estimativa (RN04/CA03)", async () => {
    forecast.mockResolvedValue({ status: "unavailable", reason: "Modelo ainda não validado." });
    renderWithProviders(<ForecastView />);
    expect(await screen.findByText("Indisponível.")).toBeInTheDocument();
    expect(screen.getByText(/Modelo ainda não validado\./)).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma estimativa é exibida/)).toBeInTheDocument();
    expect(screen.queryByTestId("fire-map")).not.toBeInTheDocument();
    expect(screen.queryByText(/MW/)).not.toBeInTheDocument();
  });

  it("distingue previsão de detecção observada (RN02/CA02)", async () => {
    forecast.mockResolvedValue(available());
    renderWithProviders(<ForecastView />);
    expect(await screen.findByRole("note")).toHaveTextContent(/PREVISÃO — não são detecções observadas/);
    await waitFor(() =>
      expect(screen.getByTestId("fire-map")).toHaveAttribute("data-observed", "3"),
    );
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-forecast", "2");
    expect(screen.getByText(/Previsto — não é detecção observada/)).toBeInTheDocument();
    expect(screen.getAllByText(/previsto/i).length).toBeGreaterThan(0);
  });

  it("mostra modelo, região e horizonte (CA01)", async () => {
    forecast.mockResolvedValue(available());
    renderWithProviders(<ForecastView />);
    expect(await screen.findByText("Modelo X v1.2")).toBeInTheDocument();
    expect(screen.getByText("Brasil")).toBeInTheDocument();
    expect(screen.getByText("13/11/2026 → 20/11/2026")).toBeInTheDocument();
  });

  it("exibe FRP e confiança somente quando o modelo fornece, com unidade e métrica (RN03)", async () => {
    forecast.mockResolvedValue(available());
    renderWithProviders(<ForecastView />);
    await screen.findByText("Área Norte");
    const north = screen.getByText("Área Norte").closest("li")!;
    expect(north).toHaveTextContent("FRP previsto: 55,5 MW");
    expect(north).toHaveTextContent("Probabilidade: 0,82");
    const south = screen.getByText("Área Sul").closest("li")!;
    expect(south).not.toHaveTextContent("FRP previsto");
    expect(south).not.toHaveTextContent("Probabilidade");
  });

  it("apresenta as limitações do modelo (RN05)", async () => {
    forecast.mockResolvedValue(available());
    renderWithProviders(<ForecastView />);
    expect(await screen.findByText("Baixa resolução espacial")).toBeInTheDocument();
    expect(screen.getByText("Não considera queimadas planejadas")).toBeInTheDocument();
  });

  it("avisa quando o serviço não informou limitações", async () => {
    forecast.mockResolvedValue(available({ limitations: [] }));
    renderWithProviders(<ForecastView />);
    expect(await screen.findByText(/não informou as limitações documentadas/)).toBeInTheDocument();
  });

  it("falha de consulta oferece nova tentativa", async () => {
    forecast.mockRejectedValueOnce(new ApiError("Falha de rede"));
    forecast.mockResolvedValueOnce(available());
    renderWithProviders(<ForecastView />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha de rede");
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Modelo X v1.2")).toBeInTheDocument();
  });

  it("consulta a região da URL", async () => {
    forecast.mockResolvedValue({ status: "unavailable", reason: "x" });
    renderWithProviders(<ForecastView />, { searchParams: "?region=brasil" });
    await screen.findByText("Indisponível.");
    expect(forecast.mock.calls[0][0]).toBe("brasil");
  });
});
