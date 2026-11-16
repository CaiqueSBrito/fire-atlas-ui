import { cellToLatLng, getResolution } from "h3-js";
import { describe, expect, it } from "vitest";
import type { Bbox } from "@/types/detections";
import { cellsForBbox, MAX_QUERY_CELLS } from "./h3-region";

const PARA: Bbox = [-58.9, -9.9, -46, 2.6];
const BRASIL: Bbox = [-74, -34, -34, 6];
const WORLD: Bbox = [-180, -60, 180, 80];
const AVAILABLE = [0, 1, 2, 3];

describe("cellsForBbox", () => {
  it("usa a resolução mais fina disponível quando cabe no limite", () => {
    const { cells, resolution } = cellsForBbox(PARA, AVAILABLE);
    expect(resolution).toBe(3);
    expect(cells.length).toBeGreaterThan(100);
    expect(cells.length).toBeLessThanOrEqual(MAX_QUERY_CELLS);
    expect(cells.every((id) => getResolution(id) === 3)).toBe(true);
  });

  it("as células ficam dentro da área pedida", () => {
    const { cells } = cellsForBbox(PARA, AVAILABLE);
    for (const id of cells) {
      const [lat, lng] = cellToLatLng(id);
      expect(lng).toBeGreaterThanOrEqual(PARA[0]);
      expect(lng).toBeLessThanOrEqual(PARA[2]);
      expect(lat).toBeGreaterThanOrEqual(PARA[1]);
      expect(lat).toBeLessThanOrEqual(PARA[3]);
    }
  });

  it("área grande desce de resolução para respeitar o limite de células", () => {
    const { cells, resolution } = cellsForBbox(BRASIL, AVAILABLE);
    expect(resolution).toBeLessThan(3);
    expect(cells.length).toBeLessThanOrEqual(MAX_QUERY_CELLS);
    expect(cells.length).toBeGreaterThan(20);
  });

  it("o mundo todo usa as células da resolução 0", () => {
    const { cells, resolution } = cellsForBbox(WORLD, AVAILABLE);
    expect(resolution).toBe(0);
    expect(cells.length).toBeGreaterThan(80);
    expect(cells.length).toBeLessThanOrEqual(122);
  });

  it("área minúscula cai numa única célula da resolução mais fina", () => {
    const { cells, resolution } = cellsForBbox([-50.1, -3.1, -50, -3], AVAILABLE);
    expect(resolution).toBe(3);
    expect(cells).toHaveLength(1);
  });

  it("respeita apenas as resoluções que existem no banco", () => {
    const { resolution } = cellsForBbox(PARA, [0, 1, 2]);
    expect(resolution).toBeLessThanOrEqual(2);
  });

  it("não repete células", () => {
    const { cells } = cellsForBbox(PARA, AVAILABLE);
    expect(new Set(cells).size).toBe(cells.length);
  });

  it("sem resolução disponível ainda devolve uma célula", () => {
    const { cells } = cellsForBbox(PARA, []);
    expect(cells).toHaveLength(1);
  });
  it("não consulta a resolução retirada mesmo quando a cobertura ainda a anuncia", () => {
    const { cells, resolution } = cellsForBbox([-50.001, -3.001, -50, -3], [0, 1, 2, 3, 4, 5, 6]);
    expect(resolution).toBe(5);
    expect(cells.every((id) => getResolution(id) === 5)).toBe(true);
  });
});
