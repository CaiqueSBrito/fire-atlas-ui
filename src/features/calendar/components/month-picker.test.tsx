import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MonthPicker } from "./month-picker";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-15T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

function setup(date: string | null = null) {
  const onSelectDate = vi.fn();
  render(<MonthPicker month="2026-10" date={date} onSelectDate={onSelectDate} />);
  return { onSelectDate };
}

const open = () => userEvent.click(screen.getByRole("button", { name: /Outubro de 2026 — escolher dia/ }));

describe("MonthPicker (calendário de um mês)", () => {
  it("abre no mês exibido, com os dias da semana", async () => {
    setup();
    await open();
    const dialog = screen.getByRole("dialog", { name: "Escolher dia" });
    expect(within(dialog).getByText("outubro de 2026")).toBeInTheDocument();
    expect(within(dialog).queryByText("novembro de 2026")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("columnheader", { name: "domingo" })).toBeInTheDocument();
  });

  it("clicar no dia já troca e fecha, sem botão de aplicar", async () => {
    const { onSelectDate } = setup();
    await open();
    expect(screen.queryByRole("button", { name: "Aplicar" })).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: /^12 de outubro de 2026/ })[0]);
    expect(onSelectDate).toHaveBeenCalledWith("2026-10-12");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("destaca o dia selecionado", async () => {
    setup("2026-10-03");
    await open();
    expect(screen.getAllByRole("button", { name: /^3 de outubro de 2026/ })[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("marca hoje e não deixa escolher dias futuros", async () => {
    setup();
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByRole("button", { name: /15 de novembro de 2026 \(hoje\)/ })).toHaveAttribute("aria-current", "date");
    expect(screen.getByRole("button", { name: /16 de novembro de 2026/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Próximo mês" })).toBeDisabled();
  });

  it("volta meses com a seta", async () => {
    setup();
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Mês anterior" }));
    expect(screen.getByText("setembro de 2026")).toBeInTheDocument();
  });
});
