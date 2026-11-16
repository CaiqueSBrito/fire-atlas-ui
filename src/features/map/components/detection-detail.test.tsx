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


  it("alterna ao clicar", async () => {
    const onToggle3d = vi.fn();
    render(<DetectionDetail {...base} onToggle3d={onToggle3d} />);
    await userEvent.click(screen.getByRole("button", { name: "View in 3D" }));
    expect(onToggle3d).toHaveBeenCalledOnce();
  });

  it("fechar continua funcionando", async () => {
    const onClose = vi.fn();
    render(<DetectionDetail {...base} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
