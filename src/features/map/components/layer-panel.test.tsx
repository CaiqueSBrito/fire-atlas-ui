import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LayerPanel } from "./layer-panel";

const props = (over = {}) => ({
  base: "satellite" as const,
  heat: false,
  temperature: false,
  imageryDate: "2026-11-09",
  onChange: vi.fn(),
  ...over,
});

describe("LayerPanel", () => {
  it("lista os três mapas base e marca o atual", () => {
    render(<LayerPanel {...props({ base: "illustrated" })} />);
    const radios = within(screen.getByRole("group", { name: "Mapa base" })).getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(screen.getByRole("radio", { name: /Satélite \+ vegetação/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /Ilustrado/ })).toBeChecked();
  });

  it("troca o mapa base", async () => {
    const p = props();
    render(<LayerPanel {...p} />);
    await userEvent.click(screen.getByRole("radio", { name: /Satélite \+ vegetação/ }));
    expect(p.onChange).toHaveBeenCalledWith({ base: "vegetation" });
    await userEvent.click(screen.getByRole("radio", { name: /Ilustrado/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ base: "illustrated" });
  });

  it("liga e desliga as sobreposições de forma independente", async () => {
    const p = props();
    const { rerender } = render(<LayerPanel {...p} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Mapa de calor/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ heat: true });
    await userEvent.click(screen.getByRole("checkbox", { name: /Temperatura da superfície/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ temp: true });
    rerender(<LayerPanel {...p} heat temperature />);
    expect(screen.getByRole("checkbox", { name: /Mapa de calor/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Temperatura da superfície/ })).toBeChecked();
    await userEvent.click(screen.getByRole("checkbox", { name: /Mapa de calor/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ heat: false });
  });

  it("agrupa os controles com nomes acessíveis", () => {
    render(<LayerPanel {...props()} />);
    expect(screen.getByRole("group", { name: "Mapa base" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Sobreposições" })).toBeInTheDocument();
  });

  it("só informa a data das imagens da NASA no mapa com vegetação", () => {
    const { rerender } = render(<LayerPanel {...props()} />);
    expect(screen.queryByText(/Imagens da NASA de/)).not.toBeInTheDocument();
    rerender(<LayerPanel {...props({ base: "vegetation" })} />);
    expect(screen.getByText("09/11/2026")).toBeInTheDocument();
    expect(screen.getByText(/Imagens da NASA de/)).toBeInTheDocument();
  });

  it("temperatura carregando mostra o status", () => {
    render(
      <LayerPanel
        {...props({
          temperature: true,
          temperatureState: { status: "loading", date: "2026-11-10", onRetry: vi.fn() },
        })}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Carregando temperatura…");
  });

  it("temperatura pronta informa o dia da máxima", () => {
    render(
      <LayerPanel
        {...props({
          temperature: true,
          temperatureState: { status: "ready", date: "2026-11-10", onRetry: vi.fn() },
        })}
      />,
    );
    expect(screen.getByText(/Temperatura máxima do ar em/)).toBeInTheDocument();
    expect(screen.getByText("10/11/2026")).toBeInTheDocument();
  });

  it("falha da temperatura mostra a mensagem e permite tentar de novo", async () => {
    const onRetry = vi.fn();
    render(
      <LayerPanel
        {...props({
          temperature: true,
          temperatureState: {
            status: "error",
            date: "2026-11-10",
            message: "Limite atingido",
            onRetry,
          },
        })}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Limite atingido");
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("falha sem mensagem usa um texto padrão", () => {
    render(
      <LayerPanel
        {...props({
          temperature: true,
          temperatureState: { status: "error", date: "2026-11-10", onRetry: vi.fn() },
        })}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar a temperatura.");
  });

  it("não mostra status de temperatura com a camada desligada", () => {
    render(
      <LayerPanel
        {...props({
          temperature: false,
          temperatureState: { status: "error", date: "2026-11-10", message: "x", onRetry: vi.fn() },
        })}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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
    expect(screen.queryByRole("checkbox", { name: /Mostrar pontos sobre os hexágonos/ })).not.toBeInTheDocument();
    rerender(<LayerPanel {...props({ plot: "hex" })} />);
    expect(screen.getByRole("checkbox", { name: /Mostrar pontos sobre os hexágonos/ })).toBeChecked();
  });

  it("liga e desliga os pontos sobre os hexágonos", async () => {
    const p = props({ plot: "hex" });
    const { rerender } = render(<LayerPanel {...p} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Mostrar pontos sobre os hexágonos/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ dots: false });
    rerender(<LayerPanel {...p} dots={false} />);
    expect(screen.getByRole("checkbox", { name: /Mostrar pontos sobre os hexágonos/ })).not.toBeChecked();
    await userEvent.click(screen.getByRole("checkbox", { name: /Mostrar pontos sobre os hexágonos/ }));
    expect(p.onChange).toHaveBeenLastCalledWith({ dots: true });
  });
});
