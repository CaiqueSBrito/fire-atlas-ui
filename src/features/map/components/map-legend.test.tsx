import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MapLegend } from "./map-legend";

describe("MapLegend — camadas", () => {
  it("por padrão só mostra os sensores", () => {
    render(<MapLegend />);
    expect(screen.getByText(/MODIS/)).toBeInTheDocument();
    expect(screen.getByText(/VIIRS/)).toBeInTheDocument();
    expect(screen.queryByText(/Heatmap/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Vegetation/)).not.toBeInTheDocument();
    expect(screen.queryByText(/decorative/)).not.toBeInTheDocument();
  });


  it("vegetação mostra a escala NDVI só no mapa com vegetação", () => {
    const { rerender } = render(<MapLegend basemap="satellite" />);
    expect(screen.queryByText("Vegetation (NDVI, MODIS)")).not.toBeInTheDocument();
    rerender(<MapLegend basemap="vegetation" />);
    expect(screen.getByText("Vegetation (NDVI, MODIS)")).toBeInTheDocument();
    expect(screen.getByText("NDVI 0.1")).toBeInTheDocument();
    expect(screen.getByText("NDVI 1.0")).toBeInTheDocument();
  });


  it("camadas podem ser combinadas", () => {
    render(<MapLegend basemap="vegetation" showHeat />);
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("Heatmap (fire detection density)")).toBeInTheDocument();
    expect(screen.getByText("Vegetation (NDVI, MODIS)")).toBeInTheDocument();
  });


  it("sem hexágonos ativos a escala de hexágonos não aparece", () => {
    const { rerender } = render(<MapLegend plot="points" />);
    expect(screen.queryByText(/Fire detections per hexagon/)).not.toBeInTheDocument();
    rerender(<MapLegend plot="hex" hexInfo={null} />);
    expect(screen.queryByText(/Fire detections per hexagon/)).not.toBeInTheDocument();
  });

  it("mapa de ruas mostra o crédito do OpenStreetMap e do OpenFreeMap", () => {
    const { rerender } = render(<MapLegend basemap="satellite" />);
    expect(screen.queryByText(/OpenStreetMap contributors/)).not.toBeInTheDocument();
    rerender(<MapLegend basemap="streets" />);
    expect(screen.getByText(/© OpenStreetMap contributors · OpenFreeMap/)).toBeInTheDocument();
  });

});
