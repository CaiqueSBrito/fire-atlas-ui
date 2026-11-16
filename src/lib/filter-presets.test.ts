import { describe, expect, it } from "vitest";
import { detectPreset, presetPeriod } from "./filter-presets";

const TODAY = "2026-11-14";

describe("presetPeriod", () => {
  it("últimos 7 dias é o padrão (sem datas na URL)", () => {
    expect(presetPeriod("7d", TODAY)).toEqual({ from: null, to: null });
  });

  it("30 dias, este mês e este ano terminam hoje", () => {
    expect(presetPeriod("30d", TODAY)).toEqual({ from: "2026-10-16", to: null });
    expect(presetPeriod("month", TODAY)).toEqual({ from: "2026-11-01", to: null });
    expect(presetPeriod("year", TODAY)).toEqual({ from: "2026-01-01", to: null });
  });

  it("o ano inteiro cabe no limite de 366 dias da API", () => {
    const from = presetPeriod("year", "2028-12-31").from!;
    const days = (Date.parse("2028-12-31") - Date.parse(from)) / 864e5 + 1;
    expect(days).toBeLessThanOrEqual(366);
  });
});

describe("detectPreset", () => {
  it("reconhece cada atalho", () => {
    for (const id of ["7d", "30d", "month", "year"] as const) {
      expect(detectPreset(presetPeriod(id, TODAY), TODAY)).toBe(id);
    }
  });

  it("período com fim diferente de hoje ou início qualquer é personalizado", () => {
    expect(detectPreset({ from: "2026-10-01", to: "2026-10-31" }, TODAY)).toBe("custom");
    expect(detectPreset({ from: "2026-10-03", to: null }, TODAY)).toBe("custom");
    expect(detectPreset({ from: null, to: "2026-10-31" }, TODAY)).toBe("custom");
  });

  it("fim explícito igual a hoje continua valendo como atalho", () => {
    expect(detectPreset({ from: "2026-11-01", to: TODAY }, TODAY)).toBe("month");
  });
});

