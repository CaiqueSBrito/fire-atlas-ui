import { describe, expect, it } from "vitest";
import { colorFloor, hexColor } from "./hex";

const luminance = (hex: string) =>
  [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0);

describe("hexColor com escala logarítmica", () => {
  it("uma célula comum não fica na cor mais clara quando há células extremas", () => {
    expect(hexColor(1000, 146750)).not.toBe(hexColor(1, 146750));
    expect(luminance(hexColor(1000, 146750))).toBeLessThan(luminance(hexColor(1, 146750)) - 100);
  });

  it("separa bem faixas de ordem de grandeza diferentes", () => {
    const colors = [10, 100, 1000, 10000, 100000].map((n) => hexColor(n, 146750));
    expect(new Set(colors).size).toBe(5);
  });

  it("continua monotônica", () => {
    let last = Infinity;
    for (const n of [1, 5, 50, 500, 5000, 50000, 146750]) {
      const l = luminance(hexColor(n, 146750));
      expect(l).toBeLessThanOrEqual(last);
      last = l;
    }
  });
});

describe("hexColor com valores fracionários (atividade harmonizada)", () => {
  it("contagens inteiras mantêm a base 1", () => {
    expect(colorFloor([1, 5, 900], 900)).toBe(1);
  });

  it("valores abaixo de 1 não ficam todos com a mesma cor", () => {
    const values = [0.05, 0.3, 4.1, 83.6];
    const floor = colorFloor(values, 83.6);
    expect(floor).toBeCloseTo(0.0836, 3);
    const colors = values.map((v) => hexColor(v, 83.6, floor));
    expect(new Set(colors).size).toBe(4);
    expect(luminance(colors[1])).toBeLessThan(luminance(colors[0]));
  });
});
