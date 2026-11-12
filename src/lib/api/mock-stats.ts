import { ApiError } from "./client";
import { dailyCounts, MOCK_SOURCE, type MockMode } from "./mock-detections";
import { shiftDate } from "@/lib/utils/dates";
import type { DetectionQuery, SensorId } from "@/types/detections";
import type { StatsResponse } from "@/types/stats";

const REFERENCE_YEARS = 3;

function sum(rows: Array<Partial<Record<SensorId, number>>>, sensors: SensorId[]) {
  return rows.reduce(
    (acc, r) => acc + sensors.reduce((s, k) => s + (r[k] ?? 0), 0),
    0,
  );
}

export async function mockStats(
  q: DetectionQuery,
  mock: MockMode,
  signal?: AbortSignal,
): Promise<StatsResponse> {
  await new Promise((r) => setTimeout(r, 500));
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  if (mock === "error") {
    throw new ApiError("Simulação: o servidor está indisponível.");
  }
  if (mock === "empty") {
    return {
      bySensor: Object.fromEntries(q.sensors.map((s) => [s, 0])),
      series: [],
      source: MOCK_SOURCE,
    };
  }

  const rows = dailyCounts(q.from, q.to, q.sensors, q.bbox);
  const bySensor: StatsResponse["bySensor"] = {};
  for (const s of q.sensors) bySensor[s] = sum(rows, [s]);

  const observed = sum(rows, q.sensors);
  const refTotals = Array.from({ length: REFERENCE_YEARS }, (_, i) => {
    const off = -365 * (i + 1);
    return sum(
      dailyCounts(shiftDate(q.from, off), shiftDate(q.to, off), q.sensors, q.bbox),
      q.sensors,
    );
  });
  const reference = Math.round(refTotals.reduce((a, b) => a + b, 0) / REFERENCE_YEARS);

  return {
    bySensor,
    series: rows,
    history: q.sensors.length
      ? {
          metric: "Detecções no período",
          unit: "detecções",
          observed,
          reference,
          referencePeriod: `Mesmo recorte nos ${REFERENCE_YEARS} anos anteriores (−365, −730 e −1095 dias)`,
          method: "Média simples dos períodos de referência (simulado)",
          anomaly: observed - reference,
          anomalyDefinition:
            "Anomalia = observado − média de referência. Valor positivo indica mais detecções que o habitual.",
        }
      : null,
    source: MOCK_SOURCE,
  };
}
