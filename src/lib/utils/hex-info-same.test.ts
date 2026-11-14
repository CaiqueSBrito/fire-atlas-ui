import { describe, expect, it } from "vitest";
import { sameHexInfo, type HexCell, type HexInfo } from "./hex";

const cell = (id: string, count: number): HexCell => ({
  id,
  res: 4,
  count,
  modis: 0,
  viirs: count,
  center: [0, 0],
  edgeKm: 26,
});

const info = (over: Partial<HexInfo> = {}): HexInfo => ({
  res: 4,
  edgeKm: 26,
  max: 10,
  cells: 2,
  top: [cell("a", 10), cell("b", 5)],
  ...over,
});

describe("sameHexInfo", () => {
  it("objetos diferentes com o mesmo conteúdo são iguais", () => {
    expect(sameHexInfo(info(), info())).toBe(true);
  });

  it("nulos", () => {
    expect(sameHexInfo(null, null)).toBe(true);
    expect(sameHexInfo(null, info())).toBe(false);
    expect(sameHexInfo(info(), null)).toBe(false);
  });

  it("muda quando resolução, máximo, quantidade ou ranking mudam", () => {
    expect(sameHexInfo(info(), info({ res: 5 }))).toBe(false);
    expect(sameHexInfo(info(), info({ max: 11 }))).toBe(false);
    expect(sameHexInfo(info(), info({ cells: 3 }))).toBe(false);
    expect(sameHexInfo(info(), info({ top: [cell("a", 10)] }))).toBe(false);
    expect(sameHexInfo(info(), info({ top: [cell("a", 10), cell("c", 5)] }))).toBe(false);
    expect(sameHexInfo(info(), info({ top: [cell("a", 10), cell("b", 6)] }))).toBe(false);
  });
});
