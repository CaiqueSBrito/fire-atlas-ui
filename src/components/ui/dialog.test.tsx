import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./dialog";

function Harness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        abrir
      </button>
      <Dialog
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        title="Título"
        footer={<button type="button">rodapé</button>}
      >
        <input aria-label="campo" />
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("fechado não renderiza nada", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("aberto é um diálogo modal nomeado pelo título e leva o foco para dentro", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "abrir" }));
    const dialog = screen.getByRole("dialog", { name: "Título" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("Esc fecha e o foco volta para quem abriu", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const opener = screen.getByRole("button", { name: "abrir" });
    await userEvent.click(opener);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(opener).toHaveFocus();
  });

  it("o botão Fechar e o clique fora também fecham", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "abrir" }));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "abrir" }));
    const backdrop = screen.getByRole("dialog").previousElementSibling as HTMLElement;
    await userEvent.pointer({ keys: "[MouseLeft]", target: backdrop });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Tab não escapa do diálogo", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "abrir" }));
    const dialog = screen.getByRole("dialog");
    for (let i = 0; i < 6; i++) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    for (let i = 0; i < 6; i++) {
      await userEvent.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("trava a rolagem da página enquanto está aberto e libera ao fechar", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "abrir" }));
    expect(document.body.style.overflow).toBe("hidden");
    await userEvent.keyboard("{Escape}");
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
