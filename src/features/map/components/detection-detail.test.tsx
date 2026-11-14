import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { detection } from "@/test/detection-fixtures";
import { DetectionDetail } from "./detection-detail";

const base = {
  detection: detection(),
  source: { name: "Fonte de teste", simulated: true },
  matchesAvailable: false,
  view3d: false,
  onToggle3d: vi.fn(),
  onClose: vi.fn(),
};

describe("DetectionDetail — vista 3D", () => {
  it("oferece 'Ver em 3D' enquanto está em 2D", () => {
    render(<DetectionDetail {...base} />);
    expect(screen.getByRole("button", { name: "Ver em 3D" })).toBeInTheDocument();
  });

  it("oferece 'Voltar ao 2D' quando já está em 3D", () => {
    render(<DetectionDetail {...base} view3d />);
    expect(screen.getByRole("button", { name: "Voltar ao 2D" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver em 3D" })).not.toBeInTheDocument();
  });

  it("alterna ao clicar", async () => {
    const onToggle3d = vi.fn();
    render(<DetectionDetail {...base} onToggle3d={onToggle3d} />);
    await userEvent.click(screen.getByRole("button", { name: "Ver em 3D" }));
    expect(onToggle3d).toHaveBeenCalledOnce();
  });

  it("fechar continua funcionando", async () => {
    const onClose = vi.fn();
    render(<DetectionDetail {...base} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
