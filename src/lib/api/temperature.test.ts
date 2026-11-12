import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./client";
import { fetchTemperatureGrid, temperatureEndpoint } from "./temperature";

const axes = { lons: [-50, -40], lats: [0, -10], step: 10 };

const respond = (body: unknown, status = 200) =>
  vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

const daily = (v: number | null) => ({ daily: { temperature_2m_max: [v] } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("temperatureEndpoint", () => {
  const today = "2026-11-12";
  it("usa a previsão para datas recentes", () => {
    expect(temperatureEndpoint("2026-11-10", today)).toContain("api.open-meteo.com/v1/forecast");
    expect(temperatureEndpoint("2026-09-01", today)).toContain("v1/forecast");
  });
  it("usa o arquivo histórico para datas antigas", () => {
    expect(temperatureEndpoint("2026-03-10", today)).toContain("archive-api.open-meteo.com/v1/archive");
  });
});

describe("fetchTemperatureGrid", () => {
  it("consulta todos os pontos de uma vez e monta a grade", async () => {
    const fetchMock = respond([daily(20), daily(25), daily(30), daily(35)]);
    vi.stubGlobal("fetch", fetchMock);
    const g = await fetchTemperatureGrid(axes, "2026-11-10");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("latitude")).toBe("0,0,-10,-10");
    expect(url.searchParams.get("longitude")).toBe("-50,-40,-50,-40");
    expect(url.searchParams.get("daily")).toBe("temperature_2m_max");
    expect(url.searchParams.get("start_date")).toBe("2026-11-10");
    expect(url.searchParams.get("end_date")).toBe("2026-11-10");
    expect(g.values).toEqual([[20, 25], [30, 35]]);
    expect(g.lons).toEqual(axes.lons);
    expect(g.lats).toEqual(axes.lats);
    expect(g.min).toBe(20);
    expect(g.max).toBe(35);
    expect(g.date).toBe("2026-11-10");
  });

  it("aceita resposta de um único ponto (objeto em vez de lista)", async () => {
    vi.stubGlobal("fetch", respond(daily(28)));
    const g = await fetchTemperatureGrid({ lons: [-50], lats: [0], step: 10 }, "2026-11-10");
    expect(g.values).toEqual([[28]]);
  });

  it("mantém valores ausentes como null, sem inventar número", async () => {
    vi.stubGlobal("fetch", respond([daily(20), daily(null), daily(30), daily(35)]));
    const g = await fetchTemperatureGrid(axes, "2026-11-10");
    expect(g.values[0][1]).toBeNull();
    expect(g.min).toBe(20);
  });

  it("limite de consultas vira erro recuperável com mensagem clara", async () => {
    vi.stubGlobal("fetch", respond({ error: true }, 429));
    await expect(fetchTemperatureGrid(axes, "2026-11-10")).rejects.toMatchObject({
      status: 429,
      recoverable: true,
      message: expect.stringContaining("limite de consultas"),
    });
  });

  it("erro 5xx é recuperável e 4xx não", async () => {
    vi.stubGlobal("fetch", respond({}, 503));
    await expect(fetchTemperatureGrid(axes, "2026-11-10")).rejects.toMatchObject({ recoverable: true });
    vi.stubGlobal("fetch", respond({}, 400));
    await expect(fetchTemperatureGrid(axes, "2026-11-10")).rejects.toMatchObject({ recoverable: false });
  });

  it("falha de rede vira erro recuperável", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const error = await fetchTemperatureGrid(axes, "2026-11-10").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.recoverable).toBe(true);
  });

  it("resposta incompleta é rejeitada", async () => {
    vi.stubGlobal("fetch", respond([daily(20)]));
    await expect(fetchTemperatureGrid(axes, "2026-11-10")).rejects.toThrow(/incompleta/);
  });

  it("sem nenhum valor numérico informa ausência de dados", async () => {
    vi.stubGlobal("fetch", respond([daily(null), daily(null), daily(null), daily(null)]));
    await expect(fetchTemperatureGrid(axes, "2026-11-10")).rejects.toMatchObject({
      recoverable: false,
    });
  });

  it("propaga o cancelamento da consulta", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")));
    await expect(fetchTemperatureGrid(axes, "2026-11-10")).rejects.toMatchObject({ name: "AbortError" });
  });
});
