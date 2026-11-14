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
    await userEvent.click(screen.getByRole("switch", { name: /Mapa de calor/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ heat: true });
    rerender(<LayerPanel {...p} heat />);
    expect(screen.getByRole("switch", { name: /Mapa de calor/ })).toBeChecked();
    await userEvent.click(screen.getByRole("switch", { name: /Mapa de calor/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ heat: false });
  });

  it("não oferece escolha de mapa base: só o interruptor do mapa ilustrado", () => {
    render(<LayerPanel {...props()} />);
    expect(screen.queryByRole("group", { name: "Mapa base" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Satélite/ })).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /Mapa ilustrado/ })).toHaveAttribute("aria-checked", "false");
  });

  it("o mapa ilustrado liga e desliga voltando às ruas", async () => {
    const p = props();
    const { rerender } = render(<LayerPanel {...p} />);
    await userEvent.click(screen.getByRole("switch", { name: /Mapa ilustrado/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ base: "illustrated" });
    rerender(<LayerPanel {...p} base="illustrated" />);
    expect(screen.getByRole("switch", { name: /Mapa ilustrado/ })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("switch", { name: /Mapa ilustrado/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ base: "streets" });
  });

  it("agrupa os controles com nomes acessíveis", () => {
    render(<LayerPanel {...props()} />);
    expect(screen.getByRole("group", { name: "Visualização dos focos" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Sobreposições" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Configurações" })).toBeInTheDocument();
  });

  it("o mapa de calor não exige data (é calculado das detecções)", () => {
    render(<LayerPanel {...props({ heat: true })} />);
    expect(screen.queryByText(/Imagens da NASA de/)).not.toBeInTheDocument();
  });

  it("oferece a visualização dos focos em pontos ou hexágonos e marca a atual", () => {
    const { rerender } = render(<LayerPanel {...props()} />);
    const group = screen.getByRole("group", { name: "Visualização dos focos" });
    expect(within(group).getByRole("radio", { name: /Pontos/ })).toBeChecked();
    expect(within(group).getByRole("radio", { name: /Hexágonos \(H3\)/ })).not.toBeChecked();
    rerender(<LayerPanel {...props({ plot: "hex" })} />);
    expect(within(group).getByRole("radio", { name: /Hexágonos \(H3\)/ })).toBeChecked();
  });

  it("troca a visualização dos focos", async () => {
    const p = props();
    const { rerender } = render(<LayerPanel {...p} />);
    await userEvent.click(screen.getByRole("radio", { name: /Hexágonos \(H3\)/ }));
    expect(p.onChange).toHaveBeenCalledWith({ plot: "hex" });
    rerender(<LayerPanel {...p} plot="hex" />);
    await userEvent.click(screen.getByRole("radio", { name: /Pontos/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ plot: "points" });
  });

  it("a opção de pontos sobre os hexágonos só existe no modo H3", () => {
    const { rerender } = render(<LayerPanel {...props()} />);
    expect(screen.queryByRole("switch", { name: /Mostrar pontos sobre os hexágonos/ })).not.toBeInTheDocument();
    rerender(<LayerPanel {...props({ plot: "hex" })} />);
    expect(screen.getByRole("switch", { name: /Mostrar pontos sobre os hexágonos/ })).toBeChecked();
  });

  it("liga e desliga os pontos sobre os hexágonos", async () => {
    const p = props({ plot: "hex" });
    const { rerender } = render(<LayerPanel {...p} />);
    await userEvent.click(screen.getByRole("switch", { name: /Mostrar pontos sobre os hexágonos/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ dots: false });
    rerender(<LayerPanel {...p} dots={false} />);
    expect(screen.getByRole("switch", { name: /Mostrar pontos sobre os hexágonos/ })).not.toBeChecked();
    await userEvent.click(screen.getByRole("switch", { name: /Mostrar pontos sobre os hexágonos/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ dots: true });
  });
});
