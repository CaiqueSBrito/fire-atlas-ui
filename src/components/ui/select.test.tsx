import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./select";

const OPTIONS = [
  { value: "mundo", label: "Mundo" },
  { value: "brasil", label: "Brasil" },
  { value: "bahia", label: "Bahia" },
];

function setup(initial = "brasil") {
  const onChange = vi.fn();
  function Harness() {
    const [value, setValue] = useState(initial);
    return (
      <>
        <Select
          label="Local"
          value={value}
          options={OPTIONS}
          onChange={(v) => {
            onChange(v);
            setValue(v);
          }}
        />
        <button type="button">fora</button>
      </>
    );
  }
  render(<Harness />);
  const trigger = screen.getByRole("combobox", { name: /Local/ });
  const chevron = () => trigger.querySelector("svg")!;
  return { onChange, trigger, chevron };
}

describe("Select — setinha animada", () => {
  it("começa fechado, com a setinha para baixo", () => {
    const { trigger, chevron } = setup();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(chevron()).not.toHaveClass("rotate-180");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("gira ao abrir", async () => {
    const { trigger, chevron } = setup();
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(chevron()).toHaveClass("rotate-180");
    expect(chevron()).toHaveClass("transition-transform");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("desgira ao selecionar uma opção", async () => {
    const { trigger, chevron, onChange } = setup();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("option", { name: "Bahia" }));
    expect(onChange).toHaveBeenCalledWith("bahia");
    expect(chevron()).not.toHaveClass("rotate-180");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveTextContent("Bahia");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("desgira ao clicar em outra coisa", async () => {
    const { trigger, chevron, onChange } = setup();
    await userEvent.click(trigger);
    expect(chevron()).toHaveClass("rotate-180");
    await userEvent.click(screen.getByRole("button", { name: "fora" }));
    expect(chevron()).not.toHaveClass("rotate-180");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("desgira ao apertar Esc, sem mudar o valor", async () => {
    const { trigger, chevron, onChange } = setup();
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(chevron()).not.toHaveClass("rotate-180");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger).toHaveTextContent("Brasil");
  });

  it("desgira ao clicar de novo no próprio botão", async () => {
    const { trigger, chevron } = setup();
    await userEvent.click(trigger);
    await userEvent.click(trigger);
    expect(chevron()).not.toHaveClass("rotate-180");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("desgira ao sair com Tab", async () => {
    const { trigger, chevron } = setup();
    await userEvent.click(trigger);
    await userEvent.tab();
    expect(chevron()).not.toHaveClass("rotate-180");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("pode reabrir depois de fechar (gira de novo)", async () => {
    const { trigger, chevron } = setup();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("option", { name: "Mundo" }));
    await userEvent.click(trigger);
    expect(chevron()).toHaveClass("rotate-180");
  });
});

describe("Select — semântica e opções", () => {
  it("marca a opção atual e lista todas", async () => {
    const { trigger } = setup("bahia");
    await userEvent.click(trigger);
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent?.replace("✓", ""))).toEqual([
      "Mundo",
      "Brasil",
      "Bahia",
    ]);
    expect(screen.getByRole("option", { name: /Bahia/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("option", { name: "Mundo" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("o botão é nomeado pelo rótulo e mostra o valor atual", () => {
    const { trigger } = setup("mundo");
    expect(trigger).toHaveAccessibleName("Local");
    expect(trigger).toHaveTextContent("Mundo");
  });

  it("funciona com valores numéricos (ano)", async () => {
    const onChange = vi.fn();
    render(
      <Select
        label="Ano"
        value={2026}
        options={[2027, 2026, 2025].map((y) => ({ value: y, label: String(y) }))}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "2025" }));
    expect(onChange).toHaveBeenCalledWith(2025);
  });
});

describe("Select — teclado", () => {
  it("ArrowDown abre; setas movem; Enter escolhe", async () => {
    const { trigger, onChange } = setup("mundo");
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("bahia");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("ArrowUp não passa do início", async () => {
    const { trigger, onChange } = setup("mundo");
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}{ArrowUp}{ArrowUp}{Enter}");
    expect(onChange).toHaveBeenCalledWith("mundo");
  });

  it("Home e End vão para a primeira e a última opção", async () => {
    const { trigger, onChange } = setup("brasil");
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}{End}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("bahia");
    await userEvent.keyboard("{ArrowDown}{Home}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("mundo");
  });

  it("Espaço e Enter abrem quando fechado", async () => {
    const { trigger } = setup();
    trigger.focus();
    await userEvent.keyboard(" ");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Escape}");
    await userEvent.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("a opção ativa é anunciada por aria-activedescendant", async () => {
    const { trigger } = setup("mundo");
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    const active = trigger.getAttribute("aria-activedescendant");
    expect(active).toBeTruthy();
    expect(document.getElementById(active!)).toHaveTextContent("Brasil");
  });

  it("o foco permanece no botão enquanto navega", async () => {
    const { trigger } = setup();
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(trigger).toHaveFocus();
  });
});
