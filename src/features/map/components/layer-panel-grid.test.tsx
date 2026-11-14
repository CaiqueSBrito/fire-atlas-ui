import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LayerPanel } from "./layer-panel";

const props = (over = {}) => ({
  base: "satellite" as const,
  heat: false,
  onChange: vi.fn(),
  ...over,
});

describe("LayerPanel com fonte agregada", () => {
  it("troca as opções de visualização por um aviso com a resolução H3", () => {
    render(<LayerPanel {...props({ plot: "hex", gridOnly: { resolution: 2 } })} />);
    expect(screen.getByText(/célula H3 \(resolução 2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Pontos individuais não estão disponíveis/)).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Pontos/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Hexágonos/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /pontos sobre os hexágonos/ })).not.toBeInTheDocument();
  });

  it("as sobreposições continuam disponíveis", () => {
    render(<LayerPanel {...props({ plot: "hex", gridOnly: { resolution: 3 } })} />);
    expect(screen.getByRole("switch", { name: /Mapa de calor/ })).toBeInTheDocument();
  });

  it("sem fonte agregada as opções de visualização aparecem", () => {
    render(<LayerPanel {...props({ plot: "points" })} />);
    expect(screen.getAllByRole("radio").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/célula H3 \(resolução/)).not.toBeInTheDocument();
  });
});
