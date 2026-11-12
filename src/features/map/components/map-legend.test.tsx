import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MapLegend } from "./map-legend";

describe("MapLegend — camadas", () => {
  it("por padrão só mostra os sensores", () => {
    render(<MapLegend />);
    expect(screen.getByText(/MODIS/)).toBeInTheDocument();
    expect(screen.getByText(/VIIRS/)).toBeInTheDocument();
    expect(screen.queryByText(/Mapa de calor/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Temperatura da superfície/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Vegetação/)).not.toBeInTheDocument();
    expect(screen.queryByText(/decorativas/)).not.toBeInTheDocument();
  });

  it("mapa de calor mostra a escala de densidade", () => {
    render(<MapLegend showHeat />);
    expect(screen.getByText("Mapa de calor (densidade de focos)")).toBeInTheDocument();
    expect(screen.getByText("Menor densidade")).toBeInTheDocument();
    expect(screen.getByText("Maior densidade")).toBeInTheDocument();
  });

  it("temperatura mostra a escala em °C e o crédito dos dados", () => {
    render(<MapLegend showTemperature />);
    expect(screen.getByText("Temperatura máxima do ar (só sobre a terra)")).toBeInTheDocument();
    expect(screen.getByText("≤ −10 °C")).toBeInTheDocument();
    expect(screen.getByText("25 °C")).toBeInTheDocument();
    expect(screen.getByText("≥ 43 °C")).toBeInTheDocument();
    expect(screen.getByText("Dados: Open-Meteo.com (CC BY 4.0)")).toBeInTheDocument();
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
    render(<MapLegend basemap="vegetation" showHeat showTemperature />);
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText("Mapa de calor (densidade de focos)")).toBeInTheDocument();
    expect(screen.getByText("Vegetação (NDVI, MODIS)")).toBeInTheDocument();
    expect(screen.getByText("Temperatura máxima do ar (só sobre a terra)")).toBeInTheDocument();
  });
});
