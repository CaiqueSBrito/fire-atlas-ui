import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MapLegend } from "./map-legend";

describe("MapLegend — camadas", () => {
  it("por padrão só mostra os sensores", () => {
    render(<MapLegend />);
    expect(screen.getByText(/MODIS/)).toBeInTheDocument();
    expect(screen.getByText(/VIIRS/)).toBeInTheDocument();
    expect(screen.queryByText(/Mapa de calor/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Vegetação/)).not.toBeInTheDocument();
    expect(screen.queryByText(/decorativas/)).not.toBeInTheDocument();
  });

  it("mapa de calor mostra a escala de densidade", () => {
    render(<MapLegend showHeat />);
    expect(screen.getByText("Mapa de calor (densidade de focos)")).toBeInTheDocument();
    expect(screen.getByText("Menor densidade")).toBeInTheDocument();
    expect(screen.getByText("Maior densidade")).toBeInTheDocument();
  });

  it("vegetação mostra a escala NDVI só no mapa com vegetação", () => {
    const { rerender } = render(<MapLegend basemap="satellite" />);
    expect(screen.queryByText("Vegetação (NDVI, MODIS)")).not.toBeInTheDocument();
    rerender(<MapLegend basemap="vegetation" />);
    expect(screen.getByText("Vegetação (NDVI, MODIS)")).toBeInTheDocument();
    expect(screen.getByText("NDVI 0,1")).toBeInTheDocument();
    expect(screen.getByText("NDVI 1,0")).toBeInTheDocument();
  });

  it("mapa ilustrado avisa que as cores são decorativas e as divisões são parciais", () => {
    render(<MapLegend basemap="illustrated" />);
    expect(screen.getByText(/decorativos e não representam dados/)).toBeInTheDocument();
    expect(screen.getByText(/maiores países/)).toBeInTheDocument();
  });

  it("camadas podem ser combinadas", () => {
    render(<MapLegend basemap="vegetation" showHeat />);
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("Mapa de calor (densidade de focos)")).toBeInTheDocument();
    expect(screen.getByText("Vegetação (NDVI, MODIS)")).toBeInTheDocument();
  });

  it("hexágonos mostram a escala por contagem, a resolução e o tamanho da célula", () => {
    render(
      <MapLegend
        plot="hex"
        hexInfo={{ res: 4, edgeKm: 26.1, max: 42, cells: 310, top: [] }}
      />,
    );
    expect(screen.getByText("Focos por hexágono (H3, resolução 4)")).toBeInTheDocument();
    expect(screen.getByText("1 foco")).toBeInTheDocument();
    expect(screen.getByText("42 focos")).toBeInTheDocument();
    expect(screen.getByText(/Aresta ≈ 26,1 km · 310 células/)).toBeInTheDocument();
  });

  it("sem hexágonos ativos a escala de hexágonos não aparece", () => {
    const { rerender } = render(<MapLegend plot="points" />);
    expect(screen.queryByText(/Focos por hexágono/)).not.toBeInTheDocument();
    rerender(<MapLegend plot="hex" hexInfo={null} />);
    expect(screen.queryByText(/Focos por hexágono/)).not.toBeInTheDocument();
  });

  it("mapa de ruas mostra o crédito do OpenStreetMap e do OpenFreeMap", () => {
    const { rerender } = render(<MapLegend basemap="satellite" />);
    expect(screen.queryByText(/OpenStreetMap contributors/)).not.toBeInTheDocument();
    rerender(<MapLegend basemap="streets" />);
    expect(screen.getByText(/© OpenStreetMap contributors · OpenFreeMap/)).toBeInTheDocument();
  });

  it("legenda da previsão com escala de probabilidade e emissão", () => {
    render(<MapLegend forecastIssue="2026-11-15" />);
    expect(screen.getByText(/probabilidade de fogo nos próximos 7 dias/)).toBeInTheDocument();
    expect(screen.getByText(/Emissão de 15\/11\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/não detecção observada/)).toBeInTheDocument();
  });
});
