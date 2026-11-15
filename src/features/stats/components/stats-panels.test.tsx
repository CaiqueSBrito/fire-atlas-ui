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
        <HistoryComparison enabled cell={null} history={null} isPending={false} error={null} onRetry={() => {}} />
        <RankingPanel ranking={null} />
        <CriticalPeriods data={null} />
      </>,
    );
    expect(screen.getAllByText("Indisponível.")).toHaveLength(3);
    expect(screen.getByText(/ainda não foram aprovados/)).toBeInTheDocument();
  });

  it("histórico da célula: mesmo período do mês em cada ano, variação e método (CA03)", () => {
    render(
      <HistoryComparison
        enabled
        cell="86814c6dfffffff"
        isPending={false}
        error={null}
        onRetry={() => {}}
        history={{
          cell: "86814c6dfffffff",
          start: "2026-11-01",
          end: "2026-11-13",
          days: 13,
          current: { year: 2026, detections: 120 },
          years: [
            { year: 2022, detections: 80 },
            { year: 2023, detections: 100 },
            { year: 2025, detections: 120 },
          ],
          currentPerDay: 9.2,
          meanPerDay: 7.7,
          changePct: 19.5,
          anomalousSensors: [],
          sufficient: true,
          yearsWithData: 3,
          minYears: 3,
          yearsRequested: 5,
          notes: [],
        }}
      />,
    );
    expect(screen.getByText("86814c6dfffffff")).toBeInTheDocument();
    expect(screen.getByText(/01\/11 a 13\/11 \(13 dias\)/)).toBeInTheDocument();
    const years = screen.getByRole("list", { name: "Detecções no mesmo período de cada ano" });
    expect(years.querySelectorAll("li")).toHaveLength(6);
    expect(years).toHaveTextContent("2024sem registro");
    expect(years).toHaveTextContent("2026120 detecções");
    expect(screen.getByText(/\+19,5%/)).toBeInTheDocument();
    expect(screen.getByText(/Dentro da variação habitual/)).toBeInTheDocument();
    expect(screen.getByText(/Ano sem registro não é ano sem fogo/)).toBeInTheDocument();
  });

  it("histórico da célula sem anos suficientes não calcula variação", () => {
    render(
      <HistoryComparison
        enabled
        cell="86814c6dfffffff"
        isPending={false}
        error={null}
        onRetry={() => {}}
        history={{
          cell: "86814c6dfffffff",
          start: "2026-11-01",
          end: "2026-11-13",
          days: 13,
          current: { year: 2026, detections: 120 },
          years: [],
          currentPerDay: 9.2,
          meanPerDay: null,
          changePct: null,
          anomalousSensors: [],
          sufficient: false,
          yearsWithData: 0,
          minYears: 3,
          yearsRequested: 5,
          notes: ["VIIRS: dados insuficientes"],
        }}
      />,
    );
    expect(screen.getByText(/Comparação indisponível: 0 anos anteriores com registro/)).toBeInTheDocument();
    expect(screen.queryByText(/em relação à média/)).not.toBeInTheDocument();
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
        view3d={false}
        onToggle3d={() => {}}
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
