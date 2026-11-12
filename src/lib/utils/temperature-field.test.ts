import { describe, expect, it } from "vitest";
import {
  fieldBounds,
  fieldSize,
  fillGaps,
  gridAxes,
  gridPoints,
  inverseMercatorY,
  mercatorY,
  projector,
  renderField,
  sampleField,
  temperatureColor,
  type TemperatureGrid,
} from "./temperature-field";

const grid = (values: Array<Array<number | null>>): TemperatureGrid => ({
  lons: values[0].map((_, i) => -60 + i * 10),
  lats: values.map((_, i) => 10 - i * 10),
  values,
  date: "2026-11-10",
  min: 0,
  max: 40,
});

describe("temperatureColor", () => {
  it("usa as cores das pontas fora da escala", () => {
    expect(temperatureColor(-50)).toEqual([59, 76, 192]);
    expect(temperatureColor(80)).toEqual([139, 10, 10]);
  });
  it("devolve exatamente a cor de cada parada", () => {
    expect(temperatureColor(25)).toEqual([244, 224, 77]);
    expect(temperatureColor(10)).toEqual([43, 181, 160]);
  });
  it("interpola entre paradas", () => {
    const [r, g, b] = temperatureColor(28);
    expect(r).toBeGreaterThan(244 - 1);
    expect(g).toBeLessThan(224);
    expect(b).toBeLessThan(77);
  });
  it("esquenta de forma contínua: mais quente fica mais vermelho", () => {
    const red = (t: number) => temperatureColor(t)[0] - temperatureColor(t)[1];
    expect(red(40)).toBeGreaterThan(red(30));
    expect(red(30)).toBeGreaterThan(red(15));
  });
});

describe("mercator", () => {
  it("é inversa de si mesma", () => {
    for (const lat of [-60, -10, 0, 23.5, 70]) {
      expect(inverseMercatorY(mercatorY(lat))).toBeCloseTo(lat, 6);
    }
  });
  it("limita latitudes extremas", () => {
    expect(Number.isFinite(mercatorY(90))).toBe(true);
    expect(mercatorY(90)).toBe(mercatorY(85));
  });
});

describe("gridAxes", () => {
  it("respeita o limite de pontos", () => {
    for (const bbox of [
      [-180, -60, 180, 80],
      [-74, -34, -34, 6],
      [-50, -10, -45, -5],
    ] as const) {
      const a = gridAxes([...bbox]);
      expect(a.lons.length * a.lats.length).toBeLessThanOrEqual(400);
    }
  });
  it("cobre toda a área pedida", () => {
    const a = gridAxes([-74, -34, -34, 6]);
    expect(a.lons[0]).toBeLessThanOrEqual(-74);
    expect(a.lons.at(-1)!).toBeGreaterThanOrEqual(-34);
    expect(a.lats[0]).toBeGreaterThanOrEqual(6);
    expect(a.lats.at(-1)!).toBeLessThanOrEqual(-34);
  });
  it("longitudes crescem e latitudes decrescem", () => {
    const a = gridAxes([-74, -34, -34, 6]);
    expect([...a.lons].sort((x, y) => x - y)).toEqual(a.lons);
    expect([...a.lats].sort((x, y) => y - x)).toEqual(a.lats);
  });
  it("áreas pequenas usam passo fino e o mundo, passo grosso", () => {
    expect(gridAxes([-50, -10, -45, -5]).step).toBeLessThan(gridAxes([-180, -60, 180, 80]).step);
  });
  it("nunca ultrapassa os limites do globo", () => {
    const a = gridAxes([-200, -95, 200, 95]);
    expect(a.lons[0]).toBeGreaterThanOrEqual(-180);
    expect(a.lons.at(-1)!).toBeLessThanOrEqual(180);
    expect(Math.max(...a.lats)).toBeLessThanOrEqual(85);
    expect(Math.min(...a.lats)).toBeGreaterThanOrEqual(-85);
  });
  it("a mesma área gera sempre a mesma grade (bom para cache)", () => {
    expect(gridAxes([-74, -34, -34, 6])).toEqual(gridAxes([-74, -34, -34, 6]));
  });
});

describe("gridPoints", () => {
  it("lista latitude por linha, na ordem esperada pela API", () => {
    const pts = gridPoints({ lons: [1, 2, 3], lats: [20, 10], step: 1 });
    expect(pts).toHaveLength(6);
    expect(pts[0]).toEqual({ lat: 20, lon: 1 });
    expect(pts[2]).toEqual({ lat: 20, lon: 3 });
    expect(pts[3]).toEqual({ lat: 10, lon: 1 });
  });
});

describe("fillGaps", () => {
  it("preenche buracos com a média dos vizinhos", () => {
    const filled = fillGaps([
      [10, 10, 10],
      [10, null, 10],
      [10, 10, 10],
    ]);
    expect(filled[1][1]).toBeCloseTo(10);
  });
  it("mantém valores existentes", () => {
    expect(fillGaps([[1, 2], [3, 4]])).toEqual([[1, 2], [3, 4]]);
  });
  it("usa a média geral quando não há vizinhos", () => {
    const filled = fillGaps([[null, null], [null, null]]);
    expect(filled.flat().every((v) => v === 0)).toBe(true);
  });
});

describe("sampleField", () => {
  const lons = [0, 10, 20, 30];
  const lats = [30, 20, 10, 0];

  it("campo constante resulta no mesmo valor em qualquer ponto", () => {
    const g = lats.map(() => lons.map(() => 22));
    expect(sampleField(g, lons, lats, 12.3, 17.7)).toBeCloseTo(22);
    expect(sampleField(g, lons, lats, 0, 30)).toBeCloseTo(22);
  });

  it("reproduz os valores nos nós da grade", () => {
    const g = lats.map((_, y) => lons.map((__, x) => y * 10 + x));
    expect(sampleField(g, lons, lats, 10, 20)).toBeCloseTo(11);
    expect(sampleField(g, lons, lats, 30, 0)).toBeCloseTo(33);
  });

  it("interpola suavemente entre dois valores", () => {
    const g = lats.map(() => [10, 20, 30, 40]);
    expect(sampleField(g, lons, lats, 15, 15)).toBeCloseTo(25, 0);
  });

  it("pontos fora da grade usam a borda", () => {
    const g = lats.map(() => [10, 20, 30, 40]);
    expect(Number.isFinite(sampleField(g, lons, lats, -50, 100))).toBe(true);
  });
});

describe("campo renderizado", () => {
  const g = grid([
    [10, 20, 30],
    [15, 25, 35],
    [20, 30, 40],
  ]);

  it("calcula os limites da grade", () => {
    expect(fieldBounds(g)).toEqual([-60, -10, -40, 10]);
  });

  it("dimensiona a imagem respeitando a proporção de mercator", () => {
    const { width, height } = fieldSize([-180, -60, 180, 80]);
    expect(width).toBe(1024);
    expect(height).toBeGreaterThan(200);
    expect(height).toBeLessThan(1024);
    const tall = fieldSize([-10, -60, 10, 60]);
    expect(tall.height).toBe(1024);
    expect(tall.width).toBeLessThan(1024);
  });

  it("projeta as bordas da área para os cantos da imagem", () => {
    const b = fieldBounds(g);
    const { x, y } = projector(b, 200, 100);
    expect(x(b[0])).toBeCloseTo(0);
    expect(x(b[2])).toBeCloseTo(200);
    expect(y(b[3])).toBeCloseTo(0);
    expect(y(b[1])).toBeCloseTo(100);
  });

  it("gera um pixel RGBA por posição, todos preenchidos", () => {
    const px = renderField(g, 16, 8);
    expect(px).toHaveLength(16 * 8 * 4);
    for (let i = 3; i < px.length; i += 4) expect(px[i]).toBe(235);
  });

  it("canto frio é mais azul/verde e canto quente é mais vermelho", () => {
    const px = renderField(g, 32, 32);
    const at = (x: number, y: number) => {
      const o = (y * 32 + x) * 4;
      return [px[o], px[o + 1], px[o + 2]];
    };
    const cold = at(1, 1);
    const hot = at(30, 30);
    expect(hot[0] - hot[2]).toBeGreaterThan(cold[0] - cold[2]);
  });

  it("aceita buracos na grade sem quebrar", () => {
    const holes = grid([
      [10, null, 30],
      [null, null, 35],
      [20, 30, null],
    ]);
    const px = renderField(holes, 8, 8);
    expect(px.every((v) => Number.isFinite(v))).toBe(true);
  });
});
