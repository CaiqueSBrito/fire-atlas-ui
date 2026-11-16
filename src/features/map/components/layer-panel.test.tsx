import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LayerPanel } from "./layer-panel";

const props = (over = {}) => ({
  base: "satellite" as const,
  heat: false,
  onChange: vi.fn(),
  ...over,
});

describe("LayerPanel", () => {
  it("liga e desliga o mapa de calor", async () => {
    const p = props();
    const { rerender } = render(<LayerPanel {...p} />);
    await userEvent.click(screen.getByRole("switch", { name: /Heatmap/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ heat: true });
    rerender(<LayerPanel {...p} heat />);
    expect(screen.getByRole("switch", { name: /Heatmap/ })).toBeChecked();
    await userEvent.click(screen.getByRole("switch", { name: /Heatmap/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ heat: false });
  });

  it("previsão só aparece com API e liga a camada", async () => {
    const p = props();
    const { rerender } = render(<LayerPanel {...p} />);
    expect(screen.queryByRole("switch", { name: /Fire forecast/ })).not.toBeInTheDocument();
    rerender(<LayerPanel {...p} forecast={false} />);
    await userEvent.click(screen.getByRole("switch", { name: /Fire forecast/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ forecast: true });
  });


  it("o mapa ilustrado liga e desliga voltando às ruas", async () => {
    const p = props();
    const { rerender } = render(<LayerPanel {...p} />);
    await userEvent.click(screen.getByRole("switch", { name: /Illustrated map/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ base: "illustrated" });
    rerender(<LayerPanel {...p} base="illustrated" />);
    expect(screen.getByRole("switch", { name: /Illustrated map/ })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("switch", { name: /Illustrated map/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ base: "streets" });
  });



  it("oferece a visualização dos focos em pontos ou hexágonos e marca a atual", () => {
    const { rerender } = render(<LayerPanel {...props()} />);
    const group = screen.getByRole("group", { name: "Fire detection display" });
    expect(within(group).getByRole("radio", { name: /Points/ })).toBeChecked();
    expect(within(group).getByRole("radio", { name: /Hexagons \(H3\)/ })).not.toBeChecked();
    rerender(<LayerPanel {...props({ plot: "hex" })} />);
    expect(within(group).getByRole("radio", { name: /Hexagons \(H3\)/ })).toBeChecked();
  });

  it("troca a visualização dos focos", async () => {
    const p = props();
    const { rerender } = render(<LayerPanel {...p} />);
    await userEvent.click(screen.getByRole("radio", { name: /Hexagons \(H3\)/ }));
    expect(p.onChange).toHaveBeenCalledWith({ plot: "hex" });
    rerender(<LayerPanel {...p} plot="hex" />);
    await userEvent.click(screen.getByRole("radio", { name: /Points/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ plot: "points" });
  });

  it("a opção de pontos sobre os hexágonos só existe no modo H3", () => {
    const { rerender } = render(<LayerPanel {...props()} />);
    expect(screen.queryByRole("switch", { name: /Show points over hexagons/ })).not.toBeInTheDocument();
    rerender(<LayerPanel {...props({ plot: "hex" })} />);
    expect(screen.getByRole("switch", { name: /Show points over hexagons/ })).toBeChecked();
  });

  it("liga e desliga os pontos sobre os hexágonos", async () => {
    const p = props({ plot: "hex" });
    const { rerender } = render(<LayerPanel {...p} />);
    await userEvent.click(screen.getByRole("switch", { name: /Show points over hexagons/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ dots: false });
    rerender(<LayerPanel {...p} dots={false} />);
    expect(screen.getByRole("switch", { name: /Show points over hexagons/ })).not.toBeChecked();
    await userEvent.click(screen.getByRole("switch", { name: /Show points over hexagons/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ dots: true });
  });
});
