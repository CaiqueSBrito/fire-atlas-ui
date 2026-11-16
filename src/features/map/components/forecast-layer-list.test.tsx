import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ForecastCell } from "@/types/forecast";
import { ForecastLayerList } from "./forecast-layer-list";

const cell = (id: string, probability: number, extra: Partial<ForecastCell> = {}): ForecastCell => ({
  id,
  lat: -10.5,
  lon: -55.5,
  probability,
  detections24h: null,
  detections7d: null,
  frpMean7d: null,
  active: null,
  country: null,
  city: null,
  cityDistanceKm: null,
  ...extra,
});

describe("ForecastLayerList", () => {
  it("avisa que é previsão, mostra a emissão e as maiores probabilidades", () => {
    render(
      <ForecastLayerList
        cells={[
          cell("a", 0.92, { city: "Sinop", country: "Brasil", active: true }),
          cell("b", 0.4),
        ]}
        issueDate="2026-11-15"
        truncated={false}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("92%");
    expect(items[0]).toHaveTextContent("near Sinop · Brasil");
    expect(within(items[0]).getByText("recent fire")).toBeInTheDocument();
    expect(items[1]).toHaveTextContent("40%");
    expect(items[1]).toHaveTextContent("-10.5°, -55.5°");
  });

  it("lista no máximo 10 células e avisa quando a resposta foi cortada", () => {
    const cells = Array.from({ length: 15 }, (_, i) => cell(String(i), 1 - i / 20));
    render(<ForecastLayerList cells={cells} issueDate="2026-11-15" truncated />);
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
  });

});
