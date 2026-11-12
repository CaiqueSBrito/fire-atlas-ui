import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRegion } from "@/config/regions";
import type { DayResponse, MonthResponse } from "@/types/calendar";
import { mockDay, mockMonth } from "./mock-calendar";

// "Hoje" fixo para o teste: datas posteriores devem ser indisponíveis.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

async function month(m: string, region = "brasil"): Promise<MonthResponse> {
  const p = mockMonth(m, region);
  await vi.advanceTimersByTimeAsync(300);
  return p;
}
async function day(
  date: string,
  region = "brasil",
  time: "all" | "day" | "night" = "all",
): Promise<DayResponse> {
  const p = mockDay(date, region, time);
  await vi.advanceTimersByTimeAsync(300);
  return p;
}

describe("mockMonth", () => {
  it("devolve um item por dia do mês, sinalizado como simulado", async () => {
    const data = await month("2026-11");
    expect(data.days).toHaveLength(30);
    expect(data.days[0].date).toBe("2026-11-01");
    expect(data.days[29].date).toBe("2026-11-30");
    expect(data.source.simulated).toBe(true);
  });

  it("é determinístico", async () => {
    expect(await month("2026-10")).toEqual(await month("2026-10"));
  });

  it("dias futuros são sempre indisponíveis, sem contagem", async () => {
    const data = await month("2026-11");
    const future = data.days.filter((d) => d.date > "2026-11-12");
    expect(future.length).toBe(18);
    for (const d of future) {
      expect(d.status).toBe("unavailable");
      expect(d.counts).toBeUndefined();
    }
  });

  it("só informa contagem em dias com atividade", async () => {
    const data = await month("2026-10");
    for (const d of data.days) {
      if (d.status === "activity") {
        expect(d.counts).toBeDefined();
        expect((d.counts!.MODIS ?? 0) + (d.counts!.VIIRS ?? 0)).toBeGreaterThan(0);
      } else {
        expect(d.counts).toBeUndefined();
      }
    }
  });

  it("produz os três estados ao longo de alguns meses", async () => {
    const seen = new Set<string>();
    for (const m of ["2026-01", "2026-02", "2026-03", "2026-04"]) {
      (await month(m)).days.forEach((d) => seen.add(d.status));
    }
    expect(seen).toEqual(new Set(["activity", "none", "unavailable"]));
  });

  it("cancela quando o sinal é abortado", async () => {
    const ctrl = new AbortController();
    const p = mockMonth("2026-11", "brasil", ctrl.signal);
    const assertion = expect(p).rejects.toBeDefined();
    ctrl.abort();
    await assertion;
  });
});

describe("mockDay", () => {
  it("não inventa detecções nem imagens em dia indisponível", async () => {
    const d = await day("2026-12-25"); // futuro
    expect(d.status).toBe("unavailable");
    expect(d.detections).toEqual([]);
    expect(d.counts).toBeUndefined();
    expect(d.imagery).toEqual([]);
  });

  it("nunca devolve imagens (o protótipo não as inventa)", async () => {
    for (const date of ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]) {
      expect((await day(date)).imagery).toEqual([]);
    }
  });

  it("é consistente com o calendário do mês (mesma data e região)", async () => {
    const m = await month("2026-10", "bahia");
    for (const entry of m.days) {
      const d = await day(entry.date, "bahia");
      expect(d.status).toBe(entry.status);
      if (entry.status === "activity") {
        expect(d.counts).toEqual(entry.counts);
        expect(d.detections.length).toBe(
          (entry.counts!.MODIS ?? 0) + (entry.counts!.VIIRS ?? 0),
        );
      }
    }
  });

  it("detecções ficam dentro da caixa da região", async () => {
    const m = await month("2026-10", "bahia");
    const active = m.days.find((x) => x.status === "activity")!;
    const d = await day(active.date, "bahia");
    const [w, s, e, n] = getRegion("bahia").bbox;
    expect(d.detections.length).toBeGreaterThan(0);
    for (const det of d.detections) {
      expect(det.lon).toBeGreaterThanOrEqual(w);
      expect(det.lon).toBeLessThanOrEqual(e);
      expect(det.lat).toBeGreaterThanOrEqual(s);
      expect(det.lat).toBeLessThanOrEqual(n);
    }
  });

  it("filtra por horário da passagem e recalcula contagens e estado", async () => {
    const m = await month("2026-10");
    const active = m.days.find((x) => x.status === "activity")!;
    const all = await day(active.date);
    const dayOnly = await day(active.date, "brasil", "day");
    const nightOnly = await day(active.date, "brasil", "night");

    expect(dayOnly.detections.every((x) => x.dayNight === "D")).toBe(true);
    expect(nightOnly.detections.every((x) => x.dayNight === "N")).toBe(true);
    expect(dayOnly.detections.length + nightOnly.detections.length).toBe(
      all.detections.length,
    );
    for (const d of [dayOnly, nightOnly]) {
      const total = (d.counts?.MODIS ?? 0) + (d.counts?.VIIRS ?? 0);
      expect(total).toBe(d.detections.length);
      expect(d.status).toBe(d.detections.length > 0 ? "activity" : "none");
    }
  });

  it("registra região e horário pedidos", async () => {
    const d = await day("2026-10-01", "para", "night");
    expect(d.region).toBe("para");
    expect(d.passTime).toBe("night");
    expect(d.source.simulated).toBe(true);
  });
});
