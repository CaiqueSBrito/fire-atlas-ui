import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { fetchStats } from "@/lib/api/detections";
import { statsResponse } from "@/test/detection-fixtures";
import { renderWithProviders } from "@/test/render";
import { StatsDashboard } from "./stats-dashboard";

vi.mock("@/lib/api/detections", () => ({
  fetchDetections: vi.fn(),
  fetchStats: vi.fn(),
}));

const mocked = vi.mocked(fetchStats);

beforeEach(() => {
  mocked.mockReset();
});

describe("StatsDashboard (NASA-014)", () => {
  it("mostra carregamento enquanto consulta", () => {
    mocked.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<StatsDashboard />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando indicadores…");
  });

  it("apresenta indicadores por sensor, total e gráfico para o recorte (CA01)", async () => {
    mocked.mockResolvedValue(statsResponse());
    renderWithProviders(<StatsDashboard />);
    expect(await screen.findByText("1.200")).toBeInTheDocument();
    expect(screen.getByText("3.400")).toBeInTheDocument();
    expect(screen.getByText("4.600")).toBeInTheDocument();
    expect(screen.getByText("Detecções por dia")).toBeInTheDocument();
  });

  it("descreve o recorte nos filtros do mapa e do calendário", async () => {
    mocked.mockResolvedValue(statsResponse());
    renderWithProviders(<StatsDashboard />, {
      searchParams: "?region=brasil&sensors=viirs&from=2026-03-01&to=2026-03-10",
    });
    await screen.findByText("Detecções por dia");
    expect(
      screen.getByText(/Brasil, de 01\/03\/2026 a 10\/03\/2026 · VIIRS/),
    ).toBeInTheDocument();
  });

  it("consulta de novo quando os filtros mudam (CA02)", async () => {
    mocked.mockResolvedValue(statsResponse());
    const first = renderWithProviders(<StatsDashboard />, { searchParams: "?sensors=viirs" });
    await screen.findByText("Detecções por dia");
    expect(mocked.mock.calls[0][0].sensors).toEqual(["viirs"]);
    first.unmount();
    renderWithProviders(<StatsDashboard />, { searchParams: "?sensors=modis" });
    await screen.findByText("Detecções por dia");
    expect(mocked.mock.calls.at(-1)![0].sensors).toEqual(["modis"]);
  });

  it("sinaliza harmonizado, FRP, histórico, ranking e períodos críticos como indisponíveis sem inventar valor (CA04)", async () => {
    mocked.mockResolvedValue(statsResponse());
    renderWithProviders(<StatsDashboard />);
    await screen.findByText("Detecções por dia");
    expect(screen.getByText(/harmonização ainda não validada/)).toBeInTheDocument();
    expect(screen.getByText(/dado de FRP não foi fornecido/)).toBeInTheDocument();
    expect(screen.getAllByText("Indisponível.")).toHaveLength(3);
    expect(screen.getByText(/ainda não foram aprovados/)).toBeInTheDocument();
    expect(screen.getByText(/critério científico/)).toBeInTheDocument();
  });

  it("exibe histórico, ranking e períodos críticos quando a API fornece (CA03)", async () => {
    mocked.mockResolvedValue(
      statsResponse({
        history: {
          metric: "Detecções",
          unit: "detecções",
          observed: 4600,
          reference: 4000,
          referencePeriod: "2023–2025",
          method: "Média simples",
          anomaly: 600,
          anomalyDefinition: "Observado − referência",
        },
        ranking: {
          criterion: "Total de detecções",
          rule: "Ordem decrescente",
          unit: "detecções",
          items: [
            { label: "Pará", value: 900 },
            { label: "Mato Grosso", value: 700 },
          ],
        },
        criticalPeriods: {
          criterion: "Acima do percentil 90",
          items: [{ label: "Semana crítica", from: "2026-11-01", to: "2026-11-07", value: 500 }],
        },
        harmonized: { total: 4300 },
      }),
    );
    renderWithProviders(<StatsDashboard />);
    expect(await screen.findByText("2023–2025")).toBeInTheDocument();
    expect(screen.getByText("Média simples")).toBeInTheDocument();
    expect(screen.getByText("Pará")).toBeInTheDocument();
    expect(screen.getByText(/Ordem decrescente/)).toBeInTheDocument();
    expect(screen.getByText("Semana crítica")).toBeInTheDocument();
    expect(screen.getByText("4.300")).toBeInTheDocument();
    expect(screen.queryByText("Indisponível.")).not.toBeInTheDocument();
  });

  it("sem detecções no recorte não afirma ausência de fogo", async () => {
    mocked.mockResolvedValue(statsResponse({ bySensor: { modis: 0, viirs: 0 }, series: [] }));
    renderWithProviders(<StatsDashboard />);
    expect(await screen.findByText("Nenhuma detecção registrada neste recorte")).toBeInTheDocument();
    expect(screen.getByText(/não significa que não houve fogo/)).toBeInTheDocument();
  });

  it("falha recuperável oferece nova tentativa", async () => {
    mocked.mockRejectedValueOnce(new ApiError("Servidor fora do ar"));
    mocked.mockResolvedValueOnce(statsResponse());
    renderWithProviders(<StatsDashboard />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Servidor fora do ar");
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Detecções por dia")).toBeInTheDocument();
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it("falha não recuperável não oferece nova tentativa", async () => {
    mocked.mockRejectedValue(new ApiError("Acesso negado", 403, false));
    renderWithProviders(<StatsDashboard />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Acesso negado");
    expect(screen.queryByRole("button", { name: "Tentar novamente" })).not.toBeInTheDocument();
  });

  it("filtro inválido não consulta", async () => {
    renderWithProviders(<StatsDashboard />, { searchParams: "?from=2026-05-10&to=2026-05-01" });
    expect(await screen.findByText("Filtro inválido")).toBeInTheDocument();
    expect(mocked).not.toHaveBeenCalled();
  });

  it("exibe os metadados de origem e sinaliza dados simulados", async () => {
    mocked.mockResolvedValue(statsResponse());
    renderWithProviders(<StatsDashboard />);
    await screen.findByText("Detecções por dia");
    expect(screen.getByText(/Fonte de teste — simulado/)).toBeInTheDocument();
    expect(screen.getByText(/detecções \(contagem\)/)).toBeInTheDocument();
  });
});
