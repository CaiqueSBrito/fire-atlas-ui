import { describe, expect, it } from "vitest";
import { fetchForecast } from "./forecast";
import { dailyCounts, mockDetections } from "./mock-detections";
import { mockStats } from "./mock-stats";
import { bboxContains } from "@/lib/utils/bbox";
import type { DetectionQuery } from "@/types/detections";

const q: DetectionQuery = {
  sensors: ["modis", "viirs"],
  from: "2026-11-06",
  to: "2026-11-08",
  bbox: [-74, -34, -34, 6],
};

describe("adaptador simulado — mapa (NASA-012)", () => {
  it("devolve ambos os sensores e sinaliza que é simulado (CA01)", async () => {
    const r = await mockDetections(q, null);
    expect(r.source.simulated).toBe(true);
    expect(new Set(r.items.map((d) => d.sensor))).toEqual(new Set(["modis", "viirs"]));
  });

  it("só devolve pontos dentro da área e do período (CA02)", async () => {
    const r = await mockDetections(q, null);
    expect(r.items.length).toBeGreaterThan(0);
    for (const d of r.items) {
      expect(bboxContains(q.bbox, d.lon, d.lat)).toBe(true);
      const day = d.datetime.slice(0, 10);
      expect(day >= q.from && day <= q.to).toBe(true);
    }
  });

  it("respeita a seleção de sensores", async () => {
    const r = await mockDetections({ ...q, sensors: ["viirs"] }, null);
    expect(r.items.every((d) => d.sensor === "viirs")).toBe(true);
  });

  it("nunca marca correspondências (RN06: só harmonização validada)", async () => {
    const r = await mockDetections(q, null);
    expect(r.harmonization.available).toBe(false);
    expect(r.items.every((d) => !d.matchId)).toBe(true);
  });

  it("total = quantidade de pontos quando não truncado", async () => {
    const r = await mockDetections(q, null);
    expect(r.truncated).toBe(false);
    expect(r.items.length).toBe(r.total);
  });

  it("modo 'empty' devolve zero registros; 'error' falha de forma recuperável (CA04)", async () => {
    expect((await mockDetections(q, "empty")).items).toEqual([]);
    await expect(mockDetections(q, "error")).rejects.toMatchObject({ recoverable: true });
  });
});

describe("estatísticas × mapa (NASA-014)", () => {
  it("contagens do dashboard batem com as do mapa (sincronização)", async () => {
    const [det, stats] = await Promise.all([mockDetections(q, null), mockStats(q, null)]);
    const total = (stats.bySensor.modis ?? 0) + (stats.bySensor.viirs ?? 0);
    expect(total).toBe(det.total);
  });

  it("a série cobre todos os dias do período", async () => {
    const stats = await mockStats(q, null);
    expect(stats.series.map((p) => p.date)).toEqual(["2026-11-06", "2026-11-07", "2026-11-08"]);
    expect(dailyCounts(q.from, q.to, q.sensors, q.bbox)).toHaveLength(3);
  });

  it("não inventa indicadores sem fonte (RN06)", async () => {
    const s = await mockStats(q, null);
    expect(s.frp).toBeUndefined();
    expect(s.ranking).toBeUndefined();
    expect(s.criticalPeriods).toBeUndefined();
    expect(s.harmonized).toBeUndefined();
  });

  it("histórico traz período de referência, método e anomalia = observado − referência", async () => {
    const h = (await mockStats(q, null)).history!;
    expect(h.referencePeriod).toBeTruthy();
    expect(h.method).toBeTruthy();
    expect(h.anomaly).toBe(h.observed - h.reference);
  });
});

describe("previsão (NASA-015)", () => {
  it("sem serviço configurado informa indisponibilidade e nenhuma estimativa (RN04)", async () => {
    const r = await fetchForecast("brasil", q.bbox);
    expect(r.status).toBe("unavailable");
    expect(JSON.stringify(r)).not.toMatch(/areas|frpPredicted|confidence/);
  });
});
