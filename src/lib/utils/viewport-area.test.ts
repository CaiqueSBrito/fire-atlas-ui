import { describe, expect, it } from "vitest";
import type { Bbox } from "@/types/detections";
import { containsBbox, flatViewport, nextQueryArea, padViewport, spanOf } from "./viewport-area";

const VIEW: Bbox = [-60, -10, -50, 0];

describe("padViewport", () => {
  it("amplia 25% de cada lado", () => {
    expect(padViewport(VIEW)).toEqual([-62.5, -12.5, -47.5, 2.5]);
  });

  it("não passa dos limites do mundo", () => {
    expect(padViewport([-179, -89, 179, 89])).toEqual([-180, -90, 180, 90]);
  });

  it("área inválida (globo, cruzando o antimeridiano) vira o mundo", () => {
    expect(padViewport([170, -10, -170, 10])).toEqual([-180, -90, 180, 90]);
    expect(padViewport([Number.NaN, 0, 1, 1])).toEqual([-180, -90, 180, 90]);
  });
});

describe("nextQueryArea", () => {
  it("sem área anterior usa a área visível ampliada", () => {
    const area = nextQueryArea(null, VIEW);
    expect(containsBbox(area, VIEW)).toBe(true);
    expect(spanOf(area)).toBeGreaterThan(spanOf(VIEW));
  });

  it("um pequeno deslocamento dentro da área já consultada não refaz a consulta", () => {
    const area = nextQueryArea(null, VIEW);
    const moved: Bbox = [-61, -11, -51, -1];
    expect(nextQueryArea(area, moved)).toBe(area);
  });

  it("sair da área consultada gera uma nova consulta", () => {
    const area = nextQueryArea(null, VIEW);
    const far: Bbox = [-40, -10, -30, 0];
    const next = nextQueryArea(area, far);
    expect(next).not.toBe(area);
    expect(containsBbox(next, far)).toBe(true);
  });

  it("aproximar bastante refaz a consulta numa área menor, para buscar dado mais fino", () => {
    const area = nextQueryArea(null, VIEW);
    const zoomedIn: Bbox = [-56, -6, -54, -4];
    const next = nextQueryArea(area, zoomedIn);
    expect(next).not.toBe(area);
    expect(spanOf(next)).toBeLessThan(spanOf(area));
  });

  it("afastar o zoom refaz a consulta numa área maior", () => {
    const area = nextQueryArea(null, VIEW);
    const zoomedOut: Bbox = [-80, -30, -30, 20];
    const next = nextQueryArea(area, zoomedOut);
    expect(spanOf(next)).toBeGreaterThan(spanOf(area));
    expect(containsBbox(next, zoomedOut)).toBe(true);
  });
});

describe("flatViewport", () => {
  it("no equador, zoom 3 e 1024 px cobrem 90 graus de longitude", () => {
    const [w, , e] = flatViewport([0, 0], 3, 1024, 512);
    expect(e - w).toBeCloseTo(90, 5);
    expect(w).toBeCloseTo(-45, 5);
  });

  it("fica centrada na câmera", () => {
    const [w, s, e, n] = flatViewport([-52, -3], 6, 800, 600);
    expect((w + e) / 2).toBeCloseTo(-52, 5);
    expect((s + n) / 2).toBeCloseTo(-3, 1);
  });

  it("cada nível de zoom divide a área por dois", () => {
    const a = flatViewport([-52, -3], 5, 800, 600);
    const b = flatViewport([-52, -3], 6, 800, 600);
    expect(a[2] - a[0]).toBeCloseTo((b[2] - b[0]) * 2, 5);
  });

  it("a vista inclinada fica pequena, ao contrário dos limites do horizonte", () => {
    const [w, s, e, n] = flatViewport([-52, -3], 7, 1000, 700, 1 + 60 / 90);
    expect(e - w).toBeCloseTo(9.16, 1);
    expect(n - s).toBeLessThan(7);
  });

  it("alargar aumenta a área na mesma proporção", () => {
    const a = flatViewport([-52, -3], 6, 800, 600, 1);
    const b = flatViewport([-52, -3], 6, 800, 600, 2);
    expect(b[2] - b[0]).toBeCloseTo((a[2] - a[0]) * 2, 5);
  });

  it("não passa dos limites do mapa", () => {
    const [w, s, e, n] = flatViewport([179, 84], 1, 4000, 4000);
    expect(w).toBeGreaterThanOrEqual(-180);
    expect(e).toBeLessThanOrEqual(180);
    expect(s).toBeGreaterThanOrEqual(-85);
    expect(n).toBeLessThanOrEqual(85);
  });
});
