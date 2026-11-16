import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRegion } from "@/config/regions";
import { ApiError } from "@/lib/api/client";
import type * as ApiClient from "@/lib/api/client";
import type * as CoverageApi from "@/lib/api/coverage";
import { fetchDetections } from "@/lib/api/detections";
import { detectionsResponse } from "@/test/detection-fixtures";
import { renderWithProviders } from "@/test/render";
import { DayLiveMap } from "./day-live-map";

vi.mock("@/lib/api/detections", () => ({ fetchDetections: vi.fn(), fetchStats: vi.fn() }));
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof ApiClient>()),
  hasApi: true,
}));
vi.mock("@/lib/api/coverage", async (original) => ({
  ...(await original<typeof CoverageApi>()),
  fetchCoverage: vi.fn(async () => ({ resolutions: [0, 1, 2, 3, 4, 5], minDate: "2000-11-01", maxDate: "2026-11-13" })),
}));

vi.mock("@/features/map/components/fire-map-loader", () => ({
  FireMap: (p: {
    plot: string;
    showPoints: boolean;
    hexCells?: Array<{ id: string }> | null;
    hexRes?: number;
    hotAreas?: { areas: unknown[] } | null;
    showHeat: boolean;
    onViewport: (bbox: [number, number, number, number]) => void;
    interactive?: boolean;
  }) => (
    <div
      data-testid="fire-map"
      data-plot={p.plot}
      data-points={String(p.showPoints)}
      data-hex={(p.hexCells ?? []).map((c) => c.id).join(",")}
      data-hex-res={p.hexRes ?? ""}
      data-areas={p.hotAreas ? String(p.hotAreas.areas.length) : ""}
      data-heat={String(p.showHeat)}
      data-interactive={String(p.interactive !== false)}
    >
      <button type="button" onClick={() => p.onViewport([-52, -4, -50, -2])}>
        emitir-viewport
      </button>
    </div>
  ),
}));

const mocked = vi.mocked(fetchDetections);
const region = getRegion("brasil");

const cell = (id: string, count: number) => ({
  id,
  res: 4,
  count,
  modis: 0,
  viirs: count,
  center: [-50, -3] as [number, number],
  edgeKm: 26,
});

const grid = (cells = [cell("84a1b2dffffffff", 900), cell("84a1b2bffffffff", 5)]) =>
  detectionsResponse({ items: [], total: 905, grid: { resolution: 4, maxResolution: 5, cells } });

beforeEach(() => {
  mocked.mockReset();
});

describe("DayLiveMap (mesmo mapa da página do mapa)", () => {
  it("consulta o dia escolhido, com os dois sensores, e desenha só hexágonos", async () => {
    mocked.mockResolvedValue(grid());
    renderWithProviders(<DayLiveMap region={region} date="2026-11-12" />);
    await waitFor(() => expect(screen.getByTestId("fire-map")).toHaveAttribute("data-hex", "84a1b2dffffffff,84a1b2bffffffff"));
    const [query] = mocked.mock.calls[0];
    expect(query).toMatchObject({ from: "2026-11-12", to: "2026-11-12", sensors: ["modis", "viirs"] });
    expect(query.bbox).toEqual(region.bbox);
    const map = screen.getByTestId("fire-map");
    expect(map).toHaveAttribute("data-plot", "hex");
    expect(map).toHaveAttribute("data-points", "false");
    expect(map).toHaveAttribute("data-hex-res", "4");
  });

  it("ao mover ou aproximar o mapa refaz a consulta só da área visível", async () => {
    mocked.mockResolvedValue(grid());
    renderWithProviders(<DayLiveMap region={region} date="2026-11-12" />);
    await waitFor(() => expect(mocked).toHaveBeenCalled());
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-interactive", "true");
    await userEvent.click(screen.getByRole("button", { name: "emitir-viewport" }));
    await waitFor(() => expect(mocked.mock.calls.length).toBeGreaterThan(1), { timeout: 3000 });
    const query = mocked.mock.calls.at(-1)![0];
    expect(query.bbox![0]).toBeGreaterThan(region.bbox[0]);
    expect(query.bbox![2]).toBeLessThan(region.bbox[2]);
    expect(query.from).toBe("2026-11-12");
  });

  it("trocar o dia mantém a área visível escolhida", async () => {
    mocked.mockResolvedValue(grid());
    const { rerender } = renderWithProviders(<DayLiveMap region={region} date="2026-11-12" />);
    await waitFor(() => expect(mocked).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: "emitir-viewport" }));
    await waitFor(() => expect(mocked.mock.calls.length).toBeGreaterThan(1), { timeout: 3000 });
    const viewport = mocked.mock.calls.at(-1)![0].bbox;
    rerender(<DayLiveMap region={region} date="2026-11-13" />);
    await waitFor(() => expect(mocked).toHaveBeenLastCalledWith(
      expect.objectContaining({ from: "2026-11-13", bbox: viewport }), null, expect.anything(),
    ));
  });

  it("trocar a região descarta a área visível anterior", async () => {
    mocked.mockResolvedValue(grid());
    const { rerender } = renderWithProviders(<DayLiveMap region={region} date="2026-11-12" />);
    await waitFor(() => expect(mocked).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: "emitir-viewport" }));
    await waitFor(() => expect(mocked.mock.calls.length).toBeGreaterThan(1), { timeout: 3000 });
    const nextRegion = getRegion("africa");
    rerender(<DayLiveMap region={nextRegion} date="2026-11-12" />);
    await waitFor(() => expect(mocked).toHaveBeenLastCalledWith(
      expect.objectContaining({ bbox: nextRegion.bbox }), null, expect.anything(),
    ));
  });


  it("outra data refaz a consulta com a nova data", async () => {
    mocked.mockResolvedValue(grid());
    const { rerender } = renderWithProviders(<DayLiveMap region={region} date="2026-11-12" />);
    await screen.findByTestId("fire-map");
    rerender(<DayLiveMap region={region} date="2026-11-13" />);
    await waitFor(() => expect(mocked.mock.calls.some(([q]) => q.from === "2026-11-13")).toBe(true));
  });

  it("repassa as camadas da URL: calor e áreas de calor", async () => {
    mocked.mockResolvedValue(grid([cell("84a1b2dffffffff", 900), cell("84a1b2bffffffff", 5), cell("84a1b2fffffffff", 4)]));
    renderWithProviders(
      <DayLiveMap
        region={region}
        date="2026-11-12"
        layers={{ base: "streets", plot: "hex", dots: false, heat: true, areas: 25 }}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("fire-map")).toHaveAttribute("data-areas", "1"));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-heat", "true");
  });

  it("sem áreas de calor pedidas não calcula contornos", async () => {
    mocked.mockResolvedValue(grid());
    renderWithProviders(<DayLiveMap region={region} date="2026-11-12" />);
    await waitFor(() => expect(screen.getByTestId("fire-map")).toHaveAttribute("data-hex-res", "4"));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-areas", "");
  });

  it("falha informa o motivo e permite tentar de novo", async () => {
    mocked.mockRejectedValueOnce(new ApiError("Serviço fora do ar"));
    mocked.mockResolvedValueOnce(grid());
    renderWithProviders(<DayLiveMap region={region} date="2026-11-12" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Serviço fora do ar");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByTestId("fire-map")).toHaveAttribute("data-hex-res", "4"));
  });

  it("não oferece retry para parâmetros rejeitados", async () => {
    mocked.mockRejectedValue(new ApiError("Parâmetros inválidos", 400, false));
    renderWithProviders(<DayLiveMap region={region} date="2026-11-12" />);
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("identifica explicitamente um recorte incompleto", async () => {
    mocked.mockResolvedValue({ ...grid(), truncated: true });
    renderWithProviders(<DayLiveMap region={region} date="2026-11-12" />);
    expect(await screen.findByRole("note")).toBeVisible();
  });

  it("no recordss avisa sem afirmar ausência de fogo", async () => {
    mocked.mockResolvedValue(grid([]));
    renderWithProviders(<DayLiveMap region={region} date="2026-11-12" />);
    expect(await screen.findByText(/No detections recorded in this area/)).toBeInTheDocument();
    expect(screen.getByText(/does not mean there was no fire/)).toBeInTheDocument();
  });

  it("sem grade (dados simulados) desenha os pontos das detections", async () => {
    mocked.mockResolvedValue(detectionsResponse({ items: [], total: 0, grid: null }));
    renderWithProviders(<DayLiveMap region={region} date="2026-11-12" />);
    await waitFor(() => expect(screen.getByTestId("fire-map")).toHaveAttribute("data-plot", "points"));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-points", "true");
  });
  it("dia fora da cobertura informa a diferença entre fontes e não consulta nem exibe focos antigos", async () => {
    mocked.mockResolvedValue(grid());
    const { rerender } = renderWithProviders(<DayLiveMap region={region} date="2026-11-13" />);
    await waitFor(() => expect(screen.getByTestId("fire-map")).toHaveAttribute("data-hex-res", "4"));
    rerender(<DayLiveMap region={region} date="2026-11-14" />);
    expect(await screen.findByRole("note")).toHaveTextContent("Latest day with map detections: 2026-11-13");
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-hex", "");
    expect(mocked.mock.calls.every(([q]) => q.from === "2026-11-13")).toBe(true);
  });

  it("sem WebGL usa o esquema da região com os mesmos dados", async () => {
    mocked.mockResolvedValue(grid());
    renderWithProviders(<DayLiveMap region={region} date="2026-11-12" schematic />);
    expect(
      await screen.findByRole("img", { name: "Schematic map with 2 fire detections in Brazil on 2026-11-12" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("fire-map")).not.toBeInTheDocument();
  });
});
