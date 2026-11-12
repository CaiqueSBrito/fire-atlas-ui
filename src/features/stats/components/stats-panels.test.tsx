import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MapLegend } from "@/features/map/components/map-legend";
import { DetectionDetail } from "@/features/map/components/detection-detail";
import type { StatsResponse } from "@/types/stats";
import { HistoryComparison } from "./history-comparison";
import { IndicatorCards } from "./indicator-cards";
import { CriticalPeriods, RankingPanel } from "./insight-panels";

const stats: StatsResponse = {
  bySensor: { modis: 1200, viirs: 3400 },
  series: [],
  source: { name: "teste", simulated: true },
};

describe("indicadores (RN06 — sem número fictício)", () => {
  it("mostra contagens reais e marca harmonizado e FRP como indisponíveis", () => {
    render(<IndicatorCards stats={stats} sensors={["modis", "viirs"]} />);
    expect(screen.getByText("1.200")).toBeInTheDocument();
    expect(screen.getByText("3.400")).toBeInTheDocument();
    expect(screen.getByText("4.600")).toBeInTheDocument();
    expect(screen.getByText(/harmonização ainda não validada/)).toBeInTheDocument();
    expect(screen.getByText(/dado de FRP não foi fornecido/)).toBeInTheDocument();
  });

  it("distingue visualmente originais e harmonizado (RN05)", () => {
    render(
      <IndicatorCards
        stats={{ ...stats, harmonized: { total: 4000 } }}
        sensors={["modis", "viirs"]}
      />,
    );
    expect(screen.getAllByText("original")).toHaveLength(2);
    expect(screen.getByText("harmonizado")).toBeInTheDocument();
    expect(screen.getByText("4.000")).toBeInTheDocument();
  });
});

describe("painéis condicionados (CA04)", () => {
  it("histórico, ranking e períodos críticos indisponíveis informam o motivo", () => {
    render(
      <>
        <HistoryComparison history={null} />
        <RankingPanel ranking={null} />
        <CriticalPeriods data={null} />
      </>,
    );
    expect(screen.getAllByText("Indisponível.")).toHaveLength(3);
    expect(screen.getByText(/ainda não foram aprovados/)).toBeInTheDocument();
  });

  it("histórico exibe período de referência, método e definição (CA03)", () => {
    render(
      <HistoryComparison
        history={{
          metric: "Detecções",
          unit: "detecções",
          observed: 120,
          reference: 100,
          referencePeriod: "2023–2025",
          method: "Média simples",
          anomaly: 20,
          anomalyDefinition: "Observado − referência",
        }}
      />,
    );
    expect(screen.getByText("2023–2025")).toBeInTheDocument();
    expect(screen.getByText("Média simples")).toBeInTheDocument();
    expect(screen.getByText("Observado − referência")).toBeInTheDocument();
    expect(screen.getAllByText(/\+20/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/20,0%/)).toBeInTheDocument();
  });
});

describe("mapa — legenda e detalhes", () => {
  it("legenda identifica MODIS e VIIRS por forma + texto e não mostra correspondência por padrão (RN06)", () => {
    render(<MapLegend />);
    expect(screen.getByText(/MODIS/)).toBeInTheDocument();
    expect(screen.getByText(/VIIRS/)).toBeInTheDocument();
    expect(screen.queryByText(/Correspondência/)).not.toBeInTheDocument();
  });

  it("detalhe mostra localização, data/hora, sensor, FRP e origem; FRP ausente = 'Não informado' (RN04)", () => {
    render(
      <DetectionDetail
        detection={{
          id: "x",
          lat: -10.5,
          lon: -55.25,
          datetime: "2026-11-08T14:30:00Z",
          sensor: "viirs",
          frp: null,
        }}
        source={{ name: "Fonte X", simulated: true }}
        matchesAvailable={false}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("-10.5000°, -55.2500°")).toBeInTheDocument();
    expect(screen.getByText(/08\/11\/2026.*UTC/)).toBeInTheDocument();
    expect(screen.getByText("Não informado")).toBeInTheDocument();
    expect(screen.getByText(/Fonte X — simulado/)).toBeInTheDocument();
    expect(screen.queryByText("Correspondência")).not.toBeInTheDocument();
  });
});
