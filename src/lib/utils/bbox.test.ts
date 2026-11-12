import { describe, expect, it } from "vitest";
import {
  bboxContains,
  bboxOfPoints,
  formatBboxParam,
  padBbox,
  parseBbox,
  validateBbox,
} from "./bbox";

describe("parseBbox", () => {
  it("lê quatro números", () => {
    expect(parseBbox("-60, -10, -50, 0")).toEqual([-60, -10, -50, 0]);
  });
  it.each([null, undefined, "", "1,2,3", "1,2,3,4,5", "a,b,c,d", "1,2,3,NaN"])(
    "devolve null para %s",
    (value) => {
      expect(parseBbox(value)).toBeNull();
    },
  );
});

describe("formatBboxParam", () => {
  it("serializa sem ruído de ponto flutuante", () => {
    expect(formatBboxParam([-60, -10.123456789, -50, 0])).toBe("-60,-10.1235,-50,0");
  });
  it("é inversa de parseBbox", () => {
    const b: [number, number, number, number] = [-74, -34, -34, 6];
    expect(parseBbox(formatBboxParam(b))).toEqual(b);
  });
});

describe("validateBbox", () => {
  it("aceita o mundo inteiro e áreas internas", () => {
    expect(validateBbox([-180, -90, 180, 90])).toBeNull();
    expect(validateBbox([-74, -34, -34, 6])).toBeNull();
  });
  it("rejeita latitude e longitude fora dos limites", () => {
    expect(validateBbox([0, -91, 10, 10])).toMatch(/latitude/);
    expect(validateBbox([0, -10, 10, 91])).toMatch(/latitude/);
    expect(validateBbox([-181, -10, 10, 10])).toMatch(/longitude/);
    expect(validateBbox([0, -10, 181, 10])).toMatch(/longitude/);
  });
  it("rejeita áreas vazias ou invertidas", () => {
    expect(validateBbox([0, 10, 10, 10])).toMatch(/sul/);
    expect(validateBbox([0, 10, 10, 5])).toMatch(/sul/);
    expect(validateBbox([10, 0, 10, 5])).toMatch(/oeste/);
    expect(validateBbox([20, 0, 10, 5])).toMatch(/oeste/);
  });
});

describe("bboxContains", () => {
  const b: [number, number, number, number] = [-60, -10, -50, 0];
  it("inclui pontos internos e das bordas", () => {
    expect(bboxContains(b, -55, -5)).toBe(true);
    expect(bboxContains(b, -60, -10)).toBe(true);
    expect(bboxContains(b, -50, 0)).toBe(true);
  });
  it("exclui pontos externos", () => {
    expect(bboxContains(b, -61, -5)).toBe(false);
    expect(bboxContains(b, -55, 1)).toBe(false);
  });
});

describe("bboxOfPoints", () => {
  const fallback: [number, number, number, number] = [-180, -60, 180, 80];

  it("sem pontos devolve a área de referência", () => {
    expect(bboxOfPoints([], fallback)).toEqual(fallback);
  });

  it("envolve todos os pontos com folga", () => {
    const b = bboxOfPoints(
      [
        { lat: -20, lon: -60 },
        { lat: 0, lon: -40 },
      ],
      fallback,
    );
    expect(b[0]).toBeLessThan(-60);
    expect(b[1]).toBeLessThan(-20);
    expect(b[2]).toBeGreaterThan(-40);
    expect(b[3]).toBeGreaterThan(0);
    expect(validateBbox(b)).toBeNull();
  });

  it("um único ponto gera uma área mínima centrada nele", () => {
    const [w, s, e, n] = bboxOfPoints([{ lat: -10, lon: -50 }], fallback);
    expect((w + e) / 2).toBeCloseTo(-50);
    expect((s + n) / 2).toBeCloseTo(-10);
    expect(e - w).toBeGreaterThanOrEqual(4);
    expect(n - s).toBeGreaterThanOrEqual(4);
  });

  it("nunca ultrapassa os limites do globo", () => {
    const b = bboxOfPoints(
      [
        { lat: -89, lon: -179 },
        { lat: 89, lon: 179 },
      ],
      fallback,
    );
    expect(b).toEqual([-180, -90, 180, 90]);
  });

  it("pontos distantes resultam em uma área grande e válida", () => {
    const b = bboxOfPoints(
      [
        { lat: 60, lon: 105 },
        { lat: -33, lon: -60 },
      ],
      fallback,
    );
    expect(validateBbox(b)).toBeNull();
    expect(b[2] - b[0]).toBeGreaterThan(165);
  });
});

describe("padBbox", () => {
  it("amplia a área em cada lado pela proporção", () => {
    expect(padBbox([-60, -10, -40, 10], 0.5)).toEqual([-70, -20, -30, 20]);
  });
  it("sem margem devolve a mesma área", () => {
    expect(padBbox([-60, -10, -40, 10], 0)).toEqual([-60, -10, -40, 10]);
  });
  it("não ultrapassa os limites do globo nem de mercator", () => {
    expect(padBbox([-180, -85, 180, 85], 0.3)).toEqual([-180, -85, 180, 85]);
    const b = padBbox([-170, -80, 170, 80], 0.2);
    expect(b[0]).toBe(-180);
    expect(b[2]).toBe(180);
    expect(b[1]).toBe(-85);
    expect(b[3]).toBe(85);
  });
  it("o resultado continua sendo uma área válida", () => {
    expect(validateBbox(padBbox([-74, -34, -34, 6], 0.3))).toBeNull();
  });
});
