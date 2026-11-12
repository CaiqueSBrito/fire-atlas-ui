import { describe, expect, it } from "vitest";
import { isDirty, resolveFilters, type RawFilters } from "./filters";
import { parseBbox, validateBbox } from "./utils/bbox";

const TODAY = "2026-11-12";
const base: RawFilters = {
  sensors: ["modis", "viirs"],
  from: null,
  to: null,
  region: null,
  bbox: null,
  date: null,
};

describe("resolveFilters (RN03 — filtros)", () => {
  it("usa o padrão: últimos 7 dias, mundo, ambos os sensores", () => {
    const f = resolveFilters(base, TODAY);
    expect(f).toMatchObject({
      from: "2026-11-06",
      to: TODAY,
      regionId: "world",
      customArea: false,
      problem: null,
    });
    expect(f.sensors).toEqual(["modis", "viirs"]);
  });

  it("sincroniza com o dia escolhido no calendário", () => {
    const f = resolveFilters({ ...base, date: "2026-03-05" }, TODAY);
    expect(f.from).toBe("2026-03-05");
    expect(f.to).toBe("2026-03-05");
  });

  it("período explícito tem prioridade sobre o dia do calendário", () => {
    const f = resolveFilters(
      { ...base, date: "2026-03-05", from: "2026-01-01", to: "2026-01-31" },
      TODAY,
    );
    expect([f.from, f.to]).toEqual(["2026-01-01", "2026-01-31"]);
  });

  it("sinaliza período invertido", () => {
    const f = resolveFilters({ ...base, from: "2026-05-10", to: "2026-05-01" }, TODAY);
    expect(f.problem).toMatch(/posterior/);
  });

  it("região predefinida usa o bbox dela; área personalizada tem prioridade", () => {
    expect(resolveFilters({ ...base, region: "brasil" }, TODAY).bbox).toEqual([-74, -34, -34, 6]);
    const f = resolveFilters({ ...base, region: "brasil", bbox: "-60,-10,-50,0" }, TODAY);
    expect(f.bbox).toEqual([-60, -10, -50, 0]);
    expect(f.customArea).toBe(true);
  });

  it("área inválida na URL vira problema e cai no bbox da região", () => {
    const f = resolveFilters({ ...base, bbox: "-60,-10,-70,0" }, TODAY);
    expect(f.problem).toMatch(/oeste/);
    expect(f.customArea).toBe(false);
  });

  it("limpar filtros: só é 'sujo' quando difere do padrão", () => {
    expect(isDirty(base)).toBe(false);
    expect(isDirty({ ...base, sensors: ["modis"] })).toBe(true);
    expect(isDirty({ ...base, region: "world" })).toBe(false);
    expect(isDirty({ ...base, bbox: "0,0,1,1" })).toBe(true);
  });
});

describe("validateBbox (limites geográficos)", () => {
  it("aceita uma área válida", () => {
    expect(validateBbox([-60, -10, -50, 0])).toBeNull();
  });
  it.each([
    [[-60, -95, -50, 0], /latitude/],
    [[-190, -10, -50, 0], /longitude/],
    [[-60, 5, -50, 0], /sul/],
    [[-40, -10, -50, 0], /oeste/],
  ] as const)("rejeita %j", (b, msg) => {
    expect(validateBbox([...b] as [number, number, number, number])).toMatch(msg);
  });
  it("parseBbox rejeita lixo", () => {
    expect(parseBbox("a,b,c,d")).toBeNull();
    expect(parseBbox("1,2,3")).toBeNull();
    expect(parseBbox("1,2,3,4")).toEqual([1, 2, 3, 4]);
  });
});
