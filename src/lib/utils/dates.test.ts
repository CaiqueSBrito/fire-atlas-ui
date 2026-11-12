import { afterEach, describe, expect, it, vi } from "vitest";
import {
  daysInMonth,
  dayNumber,
  firstWeekday,
  formatLong,
  formatMonthTitle,
  formatShort,
  isValidDate,
  isValidMonth,
  maxYear,
  monthOf,
  monthShortName,
  shiftDate,
  shiftMonth,
  todayUtc,
} from "./dates";

afterEach(() => vi.useRealTimers());

describe("navegação de mês e dia", () => {
  it("avança e volta atravessando o ano", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", 0)).toBe("2026-11");
    expect(shiftMonth("2026-11", 14)).toBe("2028-01");
  });

  it("soma dias atravessando mês e ano", () => {
    expect(shiftDate("2026-02-28", 1)).toBe("2026-03-01");
    expect(shiftDate("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDate("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("calcula dias do mês, inclusive ano bissexto", () => {
    expect(daysInMonth("2026-11")).toBe(30);
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2024-02")).toBe(29);
    expect(daysInMonth("2026-12")).toBe(31);
  });

  it("acha o dia da semana do dia 1 (0 = domingo)", () => {
    expect(firstWeekday("2026-11")).toBe(0);
    expect(firstWeekday("2026-10")).toBe(4);
  });
});

describe("validação", () => {
  it("aceita apenas datas reais", () => {
    expect(isValidDate("2026-11-05")).toBe(true);
    expect(isValidDate("2024-02-29")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("05/11/2026")).toBe(false);
    expect(isValidDate("abc")).toBe(false);
    expect(isValidDate("")).toBe(false);
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
  });

  it("aceita apenas meses 01–12", () => {
    expect(isValidMonth("2026-01")).toBe(true);
    expect(isValidMonth("2026-12")).toBe(true);
    expect(isValidMonth("2026-00")).toBe(false);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-1")).toBe(false);
    expect(isValidMonth(null)).toBe(false);
  });
});

describe("formatação pt-BR", () => {
  it("formata datas e meses", () => {
    expect(formatLong("2026-10-13")).toBe("13 de outubro de 2026");
    expect(formatLong("2026-11-01")).toBe("1 de novembro de 2026");
    expect(formatMonthTitle("2026-11")).toBe("Novembro de 2026");
    expect(formatShort("2026-10-13")).toBe("13/10/2026");
    expect(dayNumber("2026-10-03")).toBe("03");
    expect(monthOf("2026-10-13")).toBe("2026-10");
  });

  it("não sofre deslocamento de fuso (UTC)", () => {
    expect(formatLong("2026-01-01")).toBe("1 de janeiro de 2026");
    expect(formatLong("2026-12-31")).toBe("31 de dezembro de 2026");
  });

  it("dá nomes curtos de mês sem ponto", () => {
    expect(monthShortName(0)).toBe("jan");
    expect(monthShortName(11)).toBe("dez");
    for (let i = 0; i < 12; i++) expect(monthShortName(i)).not.toContain(".");
  });
});

describe("relógio em UTC", () => {
  it("usa a data UTC, não a local", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T23:59:00Z"));
    expect(todayUtc()).toBe("2026-11-12");
    vi.setSystemTime(new Date("2026-11-13T00:01:00Z"));
    expect(todayUtc()).toBe("2026-11-13");
  });

  it("limite superior de ano é o ano seguinte", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
    expect(maxYear()).toBe(2027);
  });
});
