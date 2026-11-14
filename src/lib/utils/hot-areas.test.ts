import { gridDisk, latLngToCell } from "h3-js";
import { describe, expect, it } from "vitest";
import { computeHotAreas, thresholdFor } from "./hot-areas";
import { splitBbox } from "./tiles";
import type { HexCell } from "./hex";

const RES = 4;
const cell = (id: string, count: number, modis = 0): HexCell => ({
  id,
  res: RES,
  count,
  modis,
  viirs: count - modis,
  center: [0, 0],
  edgeKm: 26,
});

const centerA = latLngToCell(-10, -50, RES);
const centerB = latLngToCell(30, 20, RES);
const ringA = gridDisk(centerA, 1);
const ringB = gridDisk(centerB, 1);

const field = [
  ...ringA.map((id, i) => cell(id, i === 0 ? 500 : 300, 10)),
  ...ringB.map((id) => cell(id, 200)),
  ...gridDisk(latLngToCell(-40, 100, RES), 2).map((id) => cell(id, 2)),
];

describe("thresholdFor", () => {
  it("devolve o valor a partir do qual ficam as X% mais intensas", () => {
    const counts = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(thresholdFor(counts, 10)).toBe(91);
    expect(thresholdFor(counts, 25)).toBe(76);
  });

  it("lista vazia não tem limiar", () => {
    expect(thresholdFor([], 10)).toBe(Infinity);
  });
});

describe("computeHotAreas", () => {
  it("desligado ou sem células não gera áreas", () => {
    expect(computeHotAreas(field, 0)).toBeNull();
    expect(computeHotAreas([], 10)).toBeNull();
  });

  it("agrupa células vizinhas em áreas separadas e ignora as fracas", () => {
    const out = computeHotAreas(field, 25)!;
    expect(out.areas).toHaveLength(2);
    expect(out.cells).toBe(14);
    const ids = new Set(out.areas.flatMap((a) => a.cells));
    expect(ids.size).toBe(14);
    for (const weak of field.filter((c) => c.count === 2)) expect(ids.has(weak.id)).toBe(false);
  });

  it("totaliza focos e sensores de cada área e ordena da maior para a menor", () => {
    const out = computeHotAreas(field, 25)!;
    expect(out.areas[0].count).toBe(500 + 6 * 300);
    expect(out.areas[0].modis).toBe(70);
    expect(out.areas[0].viirs).toBe(out.areas[0].count - 70);
    expect(out.areas[1].count).toBe(7 * 200);
    expect(out.areas[0].count).toBeGreaterThan(out.areas[1].count);
  });

  it("gera um contorno único por área, em [lng, lat]", () => {
    const out = computeHotAreas(field, 25)!;
    for (const area of out.areas) {
      expect(area.polygon).toHaveLength(1);
      const ring = area.polygon[0][0];
      expect(ring[0]).toEqual(ring[ring.length - 1]);
      const [lng, lat] = ring[0];
      expect(Math.abs(lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(lng)).toBeLessThanOrEqual(180);
    }
  });

  it("um limiar mais alto mostra menos células", () => {
    const wide = computeHotAreas(field, 25)!;
    const tight = computeHotAreas(field, 5)!;
    expect(tight.cells).toBeLessThanOrEqual(wide.cells);
    expect(tight.threshold).toBeGreaterThanOrEqual(wide.threshold);
  });
});

describe("splitBbox", () => {
  it("área pequena fica num bloco só", () => {
    expect(splitBbox([-74, -34, -34, 6])).toHaveLength(1);
  });

  it("divide áreas grandes em blocos que cobrem tudo, sem sobra nem falta", () => {
    const tiles = splitBbox([-110, -50, 50, 50]);
    expect(tiles.length).toBeGreaterThan(1);
    expect(tiles.length).toBeLessThanOrEqual(12);
    expect(Math.min(...tiles.map((t) => t[0]))).toBe(-110);
    expect(Math.max(...tiles.map((t) => t[2]))).toBe(50);
    expect(Math.min(...tiles.map((t) => t[1]))).toBe(-50);
    expect(Math.max(...tiles.map((t) => t[3]))).toBe(50);
    const area = tiles.reduce((a, t) => a + (t[2] - t[0]) * (t[3] - t[1]), 0);
    expect(area).toBeCloseTo(160 * 100, 5);
  });

  it("o mundo todo respeita o máximo de blocos", () => {
    expect(splitBbox([-180, -90, 180, 90]).length).toBeLessThanOrEqual(12);
  });
});
