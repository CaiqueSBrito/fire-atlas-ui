import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRegion } from "@/config/regions";
import { supportsWebGL } from "@/lib/utils/webgl";
import type { DetectionGrid } from "@/types/detections";
import { DayMap } from "./day-map";

vi.mock("@/lib/utils/webgl", () => ({ supportsWebGL: vi.fn() }));
vi.mock("@/features/map/components/fire-map-loader", () => ({
  FireMap: (p: {
    label: string;
    plot: string;
    showPoints: boolean;
    view: number[];
    hexCells?: Array<{ id: string }> | null;
    hexRes?: number;
  }) => (
    <div
      data-testid="fire-map"
      data-label={p.label}
      data-plot={p.plot}
      data-points={String(p.showPoints)}
      data-view={p.view.join(",")}
      data-hex={(p.hexCells ?? []).map((c) => c.id).join(",")}
      data-hex-res={p.hexRes ?? ""}
    />
  ),
}));

const webgl = vi.mocked(supportsWebGL);
const region = getRegion("brasil");
const grid: DetectionGrid = {
  resolution: 3,
  cells: [
    { id: "a", res: 3, count: 10, modis: 4, viirs: 6, center: [-50, -10], edgeKm: 69 },
    { id: "b", res: 3, count: 5, modis: 0, viirs: 5, center: [-52, -12], edgeKm: 69 },
  ],
};
const props = {
  region,
  detections: [],
  grid,
  date: "2026-11-12",
  title: "Mapa esquemático com 2 células H3 com focos em Brasil",
  layers: { base: "streets" as const, plot: "points" as const, dots: true, heat: false },
};

beforeEach(() => webgl.mockReset());

describe("DayMap com células H3", () => {
  it("com WebGL desenha as células em hexágonos, mesmo que a URL peça pontos", () => {
    webgl.mockReturnValue(true);
    render(<DayMap {...props} />);
    const map = screen.getByTestId("fire-map");
    expect(map).toHaveAttribute("data-plot", "hex");
    expect(map).toHaveAttribute("data-points", "false");
    expect(map).toHaveAttribute("data-hex", "a,b");
    expect(map).toHaveAttribute("data-hex-res", "3");
    expect(map).toHaveAttribute("data-label", expect.stringContaining("2 células H3"));
  });

  it("enquadra a área das células, não a região inteira", () => {
    webgl.mockReturnValue(true);
    render(<DayMap {...props} />);
    const view = screen.getByTestId("fire-map").getAttribute("data-view")!.split(",").map(Number);
    expect(view[0]).toBeGreaterThan(region.bbox[0]);
    expect(view[2]).toBeLessThan(region.bbox[2]);
  });

  it("sem WebGL usa o gráfico esquemático com o centro das células", () => {
    webgl.mockReturnValue(false);
    render(<DayMap {...props} />);
    expect(screen.getByRole("img", { name: props.title })).toBeInTheDocument();
    expect(screen.queryByTestId("fire-map")).not.toBeInTheDocument();
  });
});
