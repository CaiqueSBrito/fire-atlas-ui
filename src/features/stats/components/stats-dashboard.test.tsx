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
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("apresenta indicadores por sensor e total para o recorte (CA01)", async () => {
    mocked.mockResolvedValue(statsResponse());
    renderWithProviders(<StatsDashboard />);
    expect(await screen.findByText("1,200")).toBeInTheDocument();
    expect(screen.getByText("3,400")).toBeInTheDocument();
    expect(screen.getByText("4,600")).toBeInTheDocument();
  });


  it("consulta de novo quando os filtros mudam (CA02)", async () => {
    mocked.mockResolvedValue(statsResponse());
    const first = renderWithProviders(<StatsDashboard />, { searchParams: "?sensors=viirs" });
    await screen.findByRole("region", { name: "Indicators" });
    expect(mocked.mock.calls[0][0].sensors).toEqual(["viirs"]);
    first.unmount();
    renderWithProviders(<StatsDashboard />, { searchParams: "?sensors=modis" });
    await screen.findByRole("region", { name: "Indicators" });
    expect(mocked.mock.calls.at(-1)![0].sensors).toEqual(["modis"]);
  });


  it("exibe ranking e períodos críticos quando a API fornece", async () => {
    mocked.mockResolvedValue(
      statsResponse({
        ranking: {
          criterion: "Total de detections",
          rule: "Ordem decrescente",
          unit: "detections",
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
    expect(await screen.findByText("Pará")).toBeInTheDocument();
    expect(screen.getByText(/Ordem decrescente/)).toBeInTheDocument();
    expect(screen.getByText("Semana crítica")).toBeInTheDocument();
    expect(screen.getByText("4,300")).toBeInTheDocument();
  });


  it("falha recuperável oferece nova tentativa", async () => {
    mocked.mockRejectedValueOnce(new ApiError("Servidor fora do ar"));
    mocked.mockResolvedValueOnce(statsResponse());
    renderWithProviders(<StatsDashboard />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Servidor fora do ar");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("1,200")).toBeInTheDocument();
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it("falha não recuperável não oferece nova tentativa", async () => {
    mocked.mockRejectedValue(new ApiError("Acesso negado", 403, false));
    renderWithProviders(<StatsDashboard />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Acesso negado");
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("filtro inválido não consulta", async () => {
    renderWithProviders(<StatsDashboard />, { searchParams: "?from=2026-05-10&to=2026-05-01" });
    expect(await screen.findByText("Invalid filter")).toBeInTheDocument();
    expect(mocked).not.toHaveBeenCalled();
  });

});
