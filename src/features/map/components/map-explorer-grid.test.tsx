import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDetections } from "@/lib/api/detections";
import { detectionsResponse } from "@/test/detection-fixtures";
import { renderWithProviders } from "@/test/render";
import { MapExplorer } from "./map-explorer";

vi.mock("@/lib/api/detections", () => ({
  fetchDetections: vi.fn(),
  fetchStats: vi.fn(),
}));

vi.mock("./fire-map-loader", () => ({
  FireMap: (p: {
    detections: unknown[];
    plot: string;
    showPoints: boolean;
    hexCells?: Array<{ id: string }> | null;
    hexRes?: number;
    hotAreas?: { areas: unknown[]; threshold: number } | null;
  }) => (
    <div
      data-testid="fire-map"
      data-count={p.detections.length}
      data-plot={p.plot}
      data-points={String(p.showPoints)}
      data-hex={(p.hexCells ?? []).map((c) => c.id).join(",")}
      data-hex-res={p.hexRes ?? ""}
      data-areas={p.hotAreas ? String(p.hotAreas.areas.length) : ""}
    />
  ),
}));

const mocked = vi.mocked(fetchDetections);

const cell = (id: string, count: number, modis: number, viirs: number) => ({
  id,
  res: 3,
  count,
  modis,
  viirs,
  center: [-50, -3] as [number, number],
  edgeKm: 69,
});

const gridResponse = (
  cells = [cell("838141fffffffff", 81, 14, 67), cell("835f23fffffffff", 69, 0, 69)],
  levels: { resolution: number; maxResolution?: number } = { resolution: 3 },
) =>
  detectionsResponse({
    items: [],
    total: 150,
    grid: { ...levels, cells },
    source: { name: "NASA FIRMS · camada agregada por célula H3", simulated: false },
  });

beforeEach(() => {
  mocked.mockReset();
});

describe("MapExplorer com dados agregados por célula H3", () => {
  it("repassa as células ao mapa, só em hexágonos e sem pontos", async () => {
    mocked.mockResolvedValue(gridResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=points" });
    expect(await screen.findByText(/150 detections in the selected area/)).toBeInTheDocument();
    const map = screen.getByTestId("fire-map");
    expect(map).toHaveAttribute("data-plot", "hex");
    expect(map).toHaveAttribute("data-points", "false");
    expect(map).toHaveAttribute("data-hex", "838141fffffffff,835f23fffffffff");
    expect(map).toHaveAttribute("data-hex-res", "3");
    expect(map).toHaveAttribute("data-count", "0");
  });

  it("explica que pontos individuais não existem nessa fonte", async () => {
    mocked.mockResolvedValue(gridResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/150 detections in the selected area/);
    expect(
      screen.getByText(/aggregates fire detections by H3 cell \(resolution 3\)/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Points/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /Show points over hexagons/ })).not.toBeInTheDocument();
  });

  it("a legenda soma MODIS e VIIRS das células", async () => {
    mocked.mockResolvedValue(gridResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/150 detections in the selected area/);
    expect(screen.getByText("136")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
  });

  it("sinaliza resultado parcial sem depender de abrir a legenda", async () => {
    mocked.mockResolvedValue({ ...gridResponse(), truncated: true });
    renderWithProviders(<MapExplorer />);
    expect(await screen.findByRole("note")).toBeVisible();
  });


  it("não lista detecções individuais", async () => {
    mocked.mockResolvedValue(gridResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/150 detections in the selected area/);
    expect(screen.queryByRole("heading", { name: /Detections \(/ })).not.toBeInTheDocument();
  });

  describe("áreas de calor", () => {
    const ring = (id: string, count: number) => ({ ...cell(id, count, 0, count), res: 3 });

    it("sem a opção ligada não envia áreas ao mapa", async () => {
      mocked.mockResolvedValue(gridResponse());
      renderWithProviders(<MapExplorer />);
      await screen.findByText(/150 detections in the selected area/);
      expect(screen.getByTestId("fire-map")).toHaveAttribute("data-areas", "");
      expect(screen.queryByText(/White outline/)).not.toBeInTheDocument();
    });

    it("com areas na URL calcula as áreas e explica o contorno, sem controle na barra lateral", async () => {
      mocked.mockResolvedValue(
        gridResponse([ring("838141fffffffff", 900), ring("835f23fffffffff", 5), ring("838ab6fffffffff", 4)]),
      );
      renderWithProviders(<MapExplorer />, { searchParams: "?areas=25" });
      await screen.findByText(/150 detections in the selected area/);
      expect(screen.getByTestId("fire-map")).toHaveAttribute("data-areas", "1");
      expect(screen.getByText(/White outline/)).toBeInTheDocument();
      expect(screen.queryByRole("radio", { name: /most intense cells/ })).not.toBeInTheDocument();
    });
  });

  describe("aviso de nível mais fino", () => {
    it("aparece quando a resolução recebida é a mais fina disponível", async () => {
      mocked.mockResolvedValue(
        gridResponse(
          [{ ...cell("85a1b2c3fffffff", 12, 2, 10), res: 5, edgeKm: 9.9 }],
          { resolution: 5, maxResolution: 5 },
        ),
      );
      renderWithProviders(<MapExplorer />);
      const note = await screen.findByRole("note");
      expect(note).toBeVisible();
    });

    it("não aparece enquanto ainda existe resolução mais fina para buscar", async () => {
      mocked.mockResolvedValue(gridResponse(undefined, { resolution: 3, maxResolution: 5 }));
      renderWithProviders(<MapExplorer />);
      await screen.findByText(/150 detections in the selected area/);
      expect(screen.queryByText(/Finest available level/)).not.toBeInTheDocument();
    });

    it("não aparece sem dados nem sem a informação da resolução máxima", async () => {
      mocked.mockResolvedValue(gridResponse());
      renderWithProviders(<MapExplorer />);
      await screen.findByText(/150 detections in the selected area/);
      expect(screen.queryByText(/Finest available level/)).not.toBeInTheDocument();
    });
  });
});
