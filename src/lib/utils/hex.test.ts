import { describe, expect, it } from "vitest";
import {
  aggregateHex,
  hexColor,
  hexInfo,
  hexResolution,
  hexRing,
  type HexCell,
} from "./hex";

const pt = (lat: number, lon: number, sensor: "modis" | "viirs" = "modis") => ({ lat, lon, sensor });

describe("hexResolution", () => {
  it("usa células maiores no mundo e menores com zoom", () => {
    expect(hexResolution(1)).toBe(2);
    expect(hexResolution(2.5)).toBe(3);
    expect(hexResolution(3.5)).toBe(4);
    expect(hexResolution(5)).toBe(5);
    expect(hexResolution(6.5)).toBe(6);
    expect(hexResolution(9)).toBe(7);
  });
  it("nunca diminui a resolução ao aproximar", () => {
    let last = 0;
    for (let z = 0; z <= 12; z += 0.5) {
      const r = hexResolution(z);
      expect(r).toBeGreaterThanOrEqual(last);
      last = r;
    }
  });
});

describe("aggregateHex", () => {
  it("sem pontos não há células", () => {
    expect(aggregateHex([], 4)).toEqual([]);
  });

  it("agrupa pontos próximos na mesma célula e conta por sensor", () => {
    const cells = aggregateHex(
      [pt(-10, -50), pt(-10.01, -50.01, "viirs"), pt(-10.02, -50, "viirs")],
      3,
    );
    expect(cells).toHaveLength(1);
    expect(cells[0]).toMatchObject({ count: 3, modis: 1, viirs: 2, res: 3 });
  });

  it("separa pontos distantes em células diferentes", () => {
    const cells = aggregateHex([pt(-10, -50), pt(60, 105)], 3);
    expect(cells).toHaveLength(2);
    expect(cells.every((c) => c.count === 1)).toBe(true);
  });

  it("preserva o total de detecções", () => {
    const points = Array.from({ length: 200 }, (_, i) => pt(-20 + (i % 20) * 0.7, -60 + (i % 13) * 0.9, i % 2 ? "viirs" : "modis"));
    const cells = aggregateHex(points, 4);
    expect(cells.reduce((s, c) => s + c.count, 0)).toBe(200);
    for (const c of cells) expect(c.modis + c.viirs).toBe(c.count);
  });

  it("resolução maior gera mais células e nunca menos", () => {
    const points = Array.from({ length: 150 }, (_, i) => pt(-20 + (i % 15) * 0.5, -60 + (i % 11) * 0.6));
    expect(aggregateHex(points, 5).length).toBeGreaterThanOrEqual(aggregateHex(points, 3).length);
  });

  it("informa o centro e o tamanho médio da aresta", () => {
    const [cell] = aggregateHex([pt(-10, -50)], 4);
    expect(cell.center[0]).toBeCloseTo(-50, 0);
    expect(cell.center[1]).toBeCloseTo(-10, 0);
    expect(cell.edgeKm).toBeGreaterThan(20);
    expect(cell.edgeKm).toBeLessThan(30);
  });

  it("é determinística", () => {
    const points = [pt(-10, -50), pt(-12, -52, "viirs")];
    expect(aggregateHex(points, 4)).toEqual(aggregateHex(points, 4));
  });
});

describe("hexRing", () => {
  it("devolve um anel fechado de hexágono", () => {
    const [cell] = aggregateHex([pt(-10, -50)], 4);
    const ring = hexRing(cell.id);
    expect(ring).toHaveLength(7);
    expect(ring[0]).toEqual(ring[6]);
  });

  it("células perto de 180° não atravessam o mapa inteiro", () => {
    const cells = aggregateHex([pt(0, 179.99), pt(0, -179.99), pt(10, 179.9)], 2);
    for (const c of cells) {
      const lons = hexRing(c.id).map((p) => p[0]);
      expect(Math.max(...lons) - Math.min(...lons)).toBeLessThan(180);
    }
  });
});

describe("hexColor", () => {
  it("1 foco usa a cor mais clara e o máximo, a mais escura", () => {
    expect(hexColor(1, 50)).toBe("#fff3b0");
    expect(hexColor(50, 50)).toBe("#a50026");
  });
  it("é monotônica: mais focos deixa a cor mais escura", () => {
    const lum = (hex: string) =>
      [1, 3, 5].reduce((s, i) => s + parseInt(hex.slice(i, i + 2), 16), 0);
    let last = Infinity;
    for (const n of [1, 3, 8, 20, 50]) {
      const l = lum(hexColor(n, 50));
      expect(l).toBeLessThanOrEqual(last);
      last = l;
    }
  });
  it("máximo 1 ou valores fora da faixa não quebram", () => {
    expect(hexColor(1, 1)).toBe("#fff3b0");
    expect(hexColor(0, 10)).toBe("#fff3b0");
    expect(hexColor(500, 10)).toBe("#a50026");
  });
});

describe("hexInfo", () => {
  const cells: HexCell[] = [3, 9, 1, 5].map((count, i) => ({
    id: `c${i}`,
    res: 4,
    count,
    modis: count,
    viirs: 0,
    center: [0, 0],
    edgeKm: 26,
  }));

  it("resume máximo, quantidade e resolução", () => {
    const info = hexInfo(cells, 4);
    expect(info).toMatchObject({ res: 4, max: 9, cells: 4 });
    expect(info.edgeKm).toBeGreaterThan(20);
  });
  it("lista os de maior contagem primeiro, limitado", () => {
    expect(hexInfo(cells, 4, 2).top.map((c) => c.count)).toEqual([9, 5]);
  });
  it("sem células o máximo é zero", () => {
    expect(hexInfo([], 3)).toMatchObject({ max: 0, cells: 0, top: [] });
  });
});
