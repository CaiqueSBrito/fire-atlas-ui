import { describe, expect, it } from "vitest";
import { continentAt, normalizeLon } from "./continent";
import type { CountryCollection, Ring } from "./countries";

const square = (w: number, s: number, e: number, n: number): Ring => [
  [w, s],
  [e, s],
  [e, n],
  [w, n],
  [w, s],
];

const countries: CountryCollection = {
  features: [
    {
      properties: { name: "Brasilia", continent: "South America" },
      geometry: { type: "Polygon", coordinates: [square(-70, -30, -40, 5)] },
    },
    {
      properties: { name: "Lago", continent: "Africa" },
      geometry: {
        type: "Polygon",
        coordinates: [square(10, -20, 40, 20), square(20, -5, 30, 5)],
      },
    },
    {
      properties: { name: "Ilhas", continent: "Oceania" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [[square(150, -20, 160, -10)], [square(170, -20, 180, -10)]],
      },
    },
    {
      properties: { name: "Gelo", continent: "Antarctica" },
      geometry: { type: "Polygon", coordinates: [square(-60, -85, 60, -70)] },
    },
    {
      properties: { name: "Alto mar", continent: "Seven seas (open ocean)" },
      geometry: { type: "Polygon", coordinates: [square(60, 30, 70, 40)] },
    },
  ],
};

describe("continentAt", () => {
  it("encontra o continente do país sob o ponto", () => {
    expect(continentAt(-55, -10, countries)).toBe("south-america");
    expect(continentAt(15, 10, countries)).toBe("africa");
  });

  it("ponto no oceano não pertence a nenhum continente", () => {
    expect(continentAt(-20, 0, countries)).toBeNull();
    expect(continentAt(100, 50, countries)).toBeNull();
  });

  it("buracos do polígono não contam", () => {
    expect(continentAt(25, 0, countries)).toBeNull();
    expect(continentAt(12, 0, countries)).toBe("africa");
  });

  it("aceita países com várias partes", () => {
    expect(continentAt(155, -15, countries)).toBe("oceania");
    expect(continentAt(175, -15, countries)).toBe("oceania");
    expect(continentAt(165, -15, countries)).toBeNull();
  });

  it("Antártida e alto mar não são regiões navegáveis", () => {
    expect(continentAt(0, -80, countries)).toBeNull();
    expect(continentAt(65, 35, countries)).toBeNull();
  });

  it("sem dados carregados devolve nulo", () => {
    expect(continentAt(-55, -10, null)).toBeNull();
    expect(continentAt(-55, -10, { features: [] })).toBeNull();
  });

  it("normaliza longitudes fora do intervalo", () => {
    expect(continentAt(-55 + 360, -10, countries)).toBe("south-america");
    expect(continentAt(-55 - 360, -10, countries)).toBe("south-america");
  });
});

describe("normalizeLon", () => {
  it.each([
    [0, 0],
    [180, -180],
    [-180, -180],
    [190, -170],
    [-190, 170],
    [540, -180],
    [-55, -55],
  ])("%d vira %d", (input, expected) => {
    expect(normalizeLon(input)).toBe(expected);
  });
});
