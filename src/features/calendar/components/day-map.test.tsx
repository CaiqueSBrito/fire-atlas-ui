import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRegion } from "@/config/regions";
import { supportsWebGL } from "@/lib/utils/webgl";
import type { Detection } from "@/types/calendar";
import type { FireDetection } from "@/types/detections";
import { DayMap } from "./day-map";

vi.mock("@/lib/utils/webgl", () => ({ supportsWebGL: vi.fn() }));
vi.mock("@/features/map/components/fire-map-loader", () => ({
  FireMap: (p: { detections: FireDetection[]; view: number[]; label: string }) => (
    <div
      data-testid="fire-map"
      data-label={p.label}
      data-view={p.view.join(",")}
      data-points={JSON.stringify(p.detections.map((d) => [d.id, d.sensor, d.datetime, d.frp]))}
    />
  ),
}));

const webgl = vi.mocked(supportsWebGL);
const region = getRegion("brasil");
const detections: Detection[] = [
  { lat: -10, lon: -50, sensor: "MODIS", dayNight: "D" },
  { lat: -12, lon: -52, sensor: "VIIRS", dayNight: "N" },
];
const props = { region, detections, date: "2026-11-05", title: "Mapa esquemático com 2 detecções em Brasil" };

beforeEach(() => {
  webgl.mockReset();
});

describe("DayMap", () => {
  it("sem WebGL usa o gráfico esquemático como alternativa", () => {
    webgl.mockReturnValue(false);
    render(<DayMap {...props} />);
    expect(screen.getByRole("img", { name: props.title })).toBeInTheDocument();
    expect(screen.queryByTestId("fire-map")).not.toBeInTheDocument();
  });

  it("com WebGL usa o mapa real enquadrado na área onde estão os focos", () => {
    webgl.mockReturnValue(true);
    render(<DayMap {...props} />);
    const map = screen.getByTestId("fire-map");
    const view = map.getAttribute("data-view")!.split(",").map(Number);
    expect(view[0]).toBeLessThan(-52);
    expect(view[2]).toBeGreaterThan(-50);
    expect(view[1]).toBeLessThan(-12);
    expect(view[3]).toBeGreaterThan(-10);
    expect(view).not.toEqual(region.bbox);
    expect(map).toHaveAttribute("data-label", "Mapa com 2 detecções em Brasil");
    expect(screen.queryByRole("img", { name: props.title })).not.toBeInTheDocument();
  });

  it("converte as detecções do calendário para o formato do mapa", () => {
    webgl.mockReturnValue(true);
    render(<DayMap {...props} />);
    const points = JSON.parse(screen.getByTestId("fire-map").getAttribute("data-points")!);
    expect(points).toEqual([
      ["MODIS-0", "modis", "2026-11-05T00:00:00Z", null],
      ["VIIRS-1", "viirs", "2026-11-05T00:00:00Z", null],
    ]);
  });

  it("não inventa FRP para detecções que não o informam", () => {
    webgl.mockReturnValue(true);
    render(<DayMap {...props} />);
    const points: Array<[string, string, string, number | null]> = JSON.parse(
      screen.getByTestId("fire-map").getAttribute("data-points")!,
    );
    expect(points.every((p) => p[3] === null)).toBe(true);
  });

  it("aceita um dia sem detecções e volta a enquadrar a região", () => {
    webgl.mockReturnValue(true);
    render(<DayMap {...props} detections={[]} />);
    const map = screen.getByTestId("fire-map");
    expect(JSON.parse(map.getAttribute("data-points")!)).toEqual([]);
    expect(map).toHaveAttribute("data-view", region.bbox.join(","));
  });

  it("muda o enquadramento quando o dia muda de focos", () => {
    webgl.mockReturnValue(true);
    const { rerender } = render(<DayMap {...props} />);
    const first = screen.getByTestId("fire-map").getAttribute("data-view");
    rerender(
      <DayMap
        {...props}
        detections={[{ lat: 2, lon: -70, sensor: "VIIRS", dayNight: "D" }]}
      />,
    );
    expect(screen.getByTestId("fire-map").getAttribute("data-view")).not.toBe(first);
  });
});
