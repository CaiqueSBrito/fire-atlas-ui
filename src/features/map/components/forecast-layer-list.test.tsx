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
    expect(screen.getByRole("note")).toHaveTextContent("PREVISÃO — não são detecções observadas");
    expect(screen.getByRole("note")).toHaveTextContent("15/11/2026");
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("92%");
    expect(items[0]).toHaveTextContent("perto de Sinop · Brasil");
    expect(within(items[0]).getByText("fogo recente")).toBeInTheDocument();
    expect(items[1]).toHaveTextContent("40%");
    expect(items[1]).toHaveTextContent("-10.5°, -55.5°");
  });

  it("lista no máximo 10 células e avisa quando a resposta foi cortada", () => {
    const cells = Array.from({ length: 15 }, (_, i) => cell(String(i), 1 - i / 20));
    render(<ForecastLayerList cells={cells} issueDate="2026-11-15" truncated />);
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    expect(screen.getByRole("note")).toHaveTextContent("Mostrando as 15 células de maior probabilidade");
  });

  it("sem células informa sem inventar", () => {
    render(<ForecastLayerList cells={[]} issueDate="2026-11-15" truncated={false} />);
    expect(screen.getByText("Nenhuma célula com previsão nesta área.")).toBeInTheDocument();
  });
});
