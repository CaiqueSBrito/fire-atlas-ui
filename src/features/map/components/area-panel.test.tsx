import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AreaPanel } from "./area-panel";

const props = (over = {}) => ({
  bbox: [-60, -10, -50, 0] as [number, number, number, number],
  customArea: false,
  drawing: false,
  onToggleDraw: vi.fn(),
  onApply: vi.fn(),
  onClear: vi.fn(),
  ...over,
});

describe("AreaPanel", () => {
  it("mostra os limites atuais nos campos", () => {
    render(<AreaPanel {...props()} />);
    expect(screen.getByLabelText(/Oeste/)).toHaveValue("-60");
    expect(screen.getByLabelText(/Sul/)).toHaveValue("-10");
    expect(screen.getByLabelText(/Leste/)).toHaveValue("-50");
    expect(screen.getByLabelText(/Norte/)).toHaveValue("0");
  });

  it("aplica coordenadas válidas", async () => {
    const p = props();
    render(<AreaPanel {...p} />);
    const west = screen.getByLabelText(/Oeste/);
    await userEvent.clear(west);
    await userEvent.type(west, "-70");
    await userEvent.click(screen.getByRole("button", { name: "Aplicar coordenadas" }));
    expect(p.onApply).toHaveBeenCalledWith([-70, -10, -50, 0]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("aceita vírgula decimal", async () => {
    const p = props();
    render(<AreaPanel {...p} />);
    const west = screen.getByLabelText(/Oeste/);
    await userEvent.clear(west);
    await userEvent.type(west, "-70,5");
    await userEvent.click(screen.getByRole("button", { name: "Aplicar coordenadas" }));
    expect(p.onApply).toHaveBeenCalledWith([-70.5, -10, -50, 0]);
  });

  it("rejeita limites fora do intervalo e não aplica", async () => {
    const p = props();
    render(<AreaPanel {...p} />);
    const north = screen.getByLabelText(/Norte/);
    await userEvent.clear(north);
    await userEvent.type(north, "95");
    await userEvent.click(screen.getByRole("button", { name: "Aplicar coordenadas" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/latitude/);
    expect(p.onApply).not.toHaveBeenCalled();
  });

  it("rejeita oeste maior que leste", async () => {
    const p = props();
    render(<AreaPanel {...p} />);
    const west = screen.getByLabelText(/Oeste/);
    await userEvent.clear(west);
    await userEvent.type(west, "10");
    await userEvent.click(screen.getByRole("button", { name: "Aplicar coordenadas" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/oeste/);
    expect(p.onApply).not.toHaveBeenCalled();
  });

  it("exige todos os campos preenchidos com números", async () => {
    const p = props();
    render(<AreaPanel {...p} />);
    await userEvent.clear(screen.getByLabelText(/Sul/));
    await userEvent.click(screen.getByRole("button", { name: "Aplicar coordenadas" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/quatro limites/);
    expect(p.onApply).not.toHaveBeenCalled();
  });

  it("alterna o modo de desenho e reflete o estado em aria-pressed", async () => {
    const p = props();
    const { rerender } = render(<AreaPanel {...p} />);
    const draw = screen.getByRole("button", { name: /Desenhar área/ });
    expect(draw).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(draw);
    expect(p.onToggleDraw).toHaveBeenCalledOnce();
    rerender(<AreaPanel {...p} drawing />);
    expect(screen.getByRole("button", { name: /cancelar/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("só oferece remover a área quando ela é personalizada", async () => {
    const p = props();
    const { rerender } = render(<AreaPanel {...p} />);
    expect(screen.queryByRole("button", { name: "Remover área" })).not.toBeInTheDocument();
    rerender(<AreaPanel {...p} customArea />);
    await userEvent.click(screen.getByRole("button", { name: "Remover área" }));
    expect(p.onClear).toHaveBeenCalledOnce();
  });
});
