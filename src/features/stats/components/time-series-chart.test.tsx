import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { statsResponse } from "@/test/detection-fixtures";
import { TimeSeriesChart } from "./time-series-chart";

const chart = (el: HTMLElement) =>
  within(el).getByRole("group", { name: /Gráfico de linhas/ });

describe("TimeSeriesChart", () => {
  const { series } = statsResponse();

  it("mostra legenda com forma e nome dos sensores selecionados", () => {
    render(<TimeSeriesChart series={series} sensors={["modis", "viirs"]} />);
    const legend = screen.getByRole("list", { name: "Legenda do gráfico" });
    expect(legend).toHaveTextContent("MODIS");
    expect(legend).toHaveTextContent("VIIRS");
    expect(legend).toHaveTextContent("◆");
    expect(legend).toHaveTextContent("●");
    expect(legend).not.toHaveTextContent("Harmonizado");
  });

  it("só inclui os sensores ativos", () => {
    render(<TimeSeriesChart series={series} sensors={["viirs"]} />);
    const legend = screen.getByRole("list", { name: "Legenda do gráfico" });
    expect(legend).not.toHaveTextContent("MODIS");
    expect(legend).toHaveTextContent("VIIRS");
  });

  it("inclui a série harmonizada, identificada, apenas quando há valores", () => {
    const withHarmonized = series.map((p) => ({ ...p, harmonized: 300 }));
    render(<TimeSeriesChart series={withHarmonized} sensors={["modis", "viirs"]} />);
    const legend = screen.getByRole("list", { name: "Legenda do gráfico" });
    expect(legend).toHaveTextContent("Harmonizado");
    expect(legend).toHaveTextContent("(harmonizado)");
  });

  it("oferece a tabela equivalente com um dia por linha", () => {
    render(<TimeSeriesChart series={series} sensors={["modis", "viirs"]} />);
    const rows = screen.getAllByRole("row", { hidden: true });
    expect(rows).toHaveLength(series.length + 1);
    expect(within(rows[1]).getByText("2026-11-06")).toBeInTheDocument();
    expect(within(rows[1]).getByText("100")).toBeInTheDocument();
    expect(within(rows[1]).getByText("200")).toBeInTheDocument();
  });

  it("mostra '—' na tabela e 'indisponível' no tooltip para valor ausente, sem interpolar", () => {
    const gaps = [
      { date: "2026-11-06", modis: 10, viirs: 20 },
      { date: "2026-11-07", modis: 11, viirs: null },
      { date: "2026-11-08", modis: 12, viirs: 22 },
    ];
    const { container } = render(<TimeSeriesChart series={gaps} sensors={["modis", "viirs"]} />);
    expect(screen.getAllByText("—", { exact: true })).toHaveLength(1);
    const g = chart(container);
    fireEvent.focus(g);
    fireEvent.keyDown(g, { key: "ArrowRight" });
    fireEvent.keyDown(g, { key: "ArrowRight" });
    expect(screen.getByRole("status")).toHaveTextContent("VIIRS: indisponível");
    expect(screen.getByRole("status")).toHaveTextContent("MODIS: 11");
  });

  it("navega por teclado: setas movem o dia e Esc fecha o tooltip", () => {
    const { container } = render(<TimeSeriesChart series={series} sensors={["modis", "viirs"]} />);
    const g = chart(container);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    fireEvent.keyDown(g, { key: "ArrowRight" });
    expect(screen.getByRole("status")).toHaveTextContent("MODIS: 100");
    fireEvent.keyDown(g, { key: "ArrowRight" });
    expect(screen.getByRole("status")).toHaveTextContent("MODIS: 150");
    fireEvent.keyDown(g, { key: "ArrowLeft" });
    expect(screen.getByRole("status")).toHaveTextContent("MODIS: 100");
    fireEvent.keyDown(g, { key: "Escape" });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("não ultrapassa o primeiro nem o último dia", () => {
    const { container } = render(<TimeSeriesChart series={series} sensors={["modis"]} />);
    const g = chart(container);
    fireEvent.keyDown(g, { key: "ArrowLeft" });
    expect(screen.getByRole("status")).toHaveTextContent("MODIS: 120");
    for (let i = 0; i < 6; i++) fireEvent.keyDown(g, { key: "ArrowLeft" });
    expect(screen.getByRole("status")).toHaveTextContent("MODIS: 100");
    for (let i = 0; i < 6; i++) fireEvent.keyDown(g, { key: "ArrowRight" });
    expect(screen.getByRole("status")).toHaveTextContent("MODIS: 120");
  });

  it("não repete rótulos do eixo X com poucos dias", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<TimeSeriesChart series={series} sensors={["modis"]} />);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("renderiza com um único dia sem quebrar", () => {
    render(<TimeSeriesChart series={[series[0]]} sensors={["modis", "viirs"]} />);
    expect(screen.getByText("Detecções por dia")).toBeInTheDocument();
    expect(screen.getAllByRole("row", { hidden: true })).toHaveLength(2);
  });
});
