import { describe, expect, it } from "vitest";
import { FLAT_MAX_ZOOM, GLOBE_MAX_ZOOM, GLOBE_PROJECTION, globeZoom } from "./map-layers";

describe("limite de zoom do globo", () => {
  it("o limite é onde o globo ainda é globo, antes da transição para o plano", () => {
    const stops = GLOBE_PROJECTION.type as unknown as Array<unknown>;
    expect(stops).toContain(GLOBE_MAX_ZOOM);
    expect(stops.indexOf("vertical-perspective")).toBe(stops.indexOf(GLOBE_MAX_ZOOM) + 1);
  });

  it("o mapa plano continua podendo aproximar bem mais que o globo", () => {
    expect(FLAT_MAX_ZOOM).toBeGreaterThan(GLOBE_MAX_ZOOM + 5);
  });

  it("o zoom inicial do globo nunca passa do limite, em qualquer tamanho de tela", () => {
    for (const [w, h] of [[320, 480], [1024, 700], [1920, 1080], [3840, 2160]]) {
      expect(globeZoom(w, h)).toBeLessThanOrEqual(GLOBE_MAX_ZOOM);
      expect(globeZoom(w, h)).toBeGreaterThanOrEqual(0.5);
    }
  });
});
