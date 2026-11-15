import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRegion } from "@/config/regions";
import { ApiError } from "@/lib/api/client";
import { fetchDetections } from "@/lib/api/detections";
import { detectionsResponse } from "@/test/detection-fixtures";
import { renderWithProviders } from "@/test/render";
import { DayLiveMap } from "./day-live-map";

vi.mock("@/lib/api/detections", () => ({ fetchDetections: vi.fn(), fetchStats: vi.fn() }));

vi.mock("@/features/map/components/fire-map-loader", () => ({
  FireMap: (p: {
    plot: string;
    showPoints: boolean;
    hexCells?: Array<{ id: string }> | null;
    hexRes?: number;
    hotAreas?: { areas: unknown[] } | null;
    showHeat: boolean;
    onViewport: (bbox: number[]) => void;
  }) => (
    <div
      data-testid="fire-map"
      data-plot={p.plot}
      data-points={String(p.showPoints)}
      data-hex={(p.hexCells ?? []).map((c) => c.id).join(",")}
      data-hex-res={p.hexRes ?? ""}
      data-areas={p.hotAreas ? String(p.hotAreas.areas.length) : ""}
      data-heat={String(p.showHeat)}
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
  detectionsResponse({ items: [], total: 905, grid: { resolution: 4, maxResolution: 6, cells } });

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
    await screen.findByTestId("fire-map");
    await userEvent.click(screen.getByRole("button", { name: "emitir-viewport" }));
    await waitFor(() => expect(mocked.mock.calls.length).toBeGreaterThan(1), { timeout: 3000 });
    const bbox = mocked.mock.calls.at(-1)![0].bbox;
    expect(bbox[0]).toBeLessThan(-52);
    expect(bbox[2]).toBeGreaterThan(-50);
    expect(bbox[2] - bbox[0]).toBeLessThan(10);
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
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(screen.getByTestId("fire-map")).toHaveAttribute("data-hex-res", "4"));
  });

  it("não oferece retry para parâmetros rejeitados", async () => {
    mocked.mockRejectedValue(new ApiError("Parâmetros inválidos", 400, false));
    renderWithProviders(<DayLiveMap region={region} date="2026-11-12" />);
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Tentar novamente" })).not.toBeInTheDocument();
  });

  it("identifica explicitamente um recorte incompleto", async () => {
    mocked.mockResolvedValue({ ...grid(), truncated: true });
    renderWithProviders(<DayLiveMap region={region} date="2026-11-12" />);
    expect(await screen.findByRole("note")).toBeVisible();
  });

  it("sem registros avisa sem afirmar ausência de fogo", async () => {
    mocked.mockResolvedValue(grid([]));
    renderWithProviders(<DayLiveMap region={region} date="2026-11-12" />);
    expect(await screen.findByText(/Nenhuma detecção registrada neste recorte/)).toBeInTheDocument();
    expect(screen.getByText(/não significa que não houve fogo/)).toBeInTheDocument();
  });

  it("sem grade (dados simulados) desenha os pontos das detecções", async () => {
    mocked.mockResolvedValue(detectionsResponse({ items: [], total: 0, grid: null }));
    renderWithProviders(<DayLiveMap region={region} date="2026-11-12" />);
    await waitFor(() => expect(screen.getByTestId("fire-map")).toHaveAttribute("data-plot", "points"));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-points", "true");
  });

  it("sem WebGL usa o esquema da região com os mesmos dados", async () => {
    mocked.mockResolvedValue(grid());
    renderWithProviders(<DayLiveMap region={region} date="2026-11-12" schematic />);
    expect(
      await screen.findByRole("img", { name: "Mapa esquemático com 2 pontos de fogo em Brasil em 2026-11-12" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("fire-map")).not.toBeInTheDocument();
  });
});
