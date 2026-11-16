import { render, screen } from "@testing-library/react";
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

const open = () => userEvent.click(screen.getByRole("button", { name: /October 2026 — choose day/ }));

describe("MonthPicker (calendário de um mês)", () => {

  it("clicar no dia já troca e fecha, sem botão de aplicar", async () => {
    const { onSelectDate } = setup();
    await open();
    expect(screen.queryByRole("button", { name: "Aplicar" })).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: /^October 12, 2026/ })[0]);
    expect(onSelectDate).toHaveBeenCalledWith("2026-10-12");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("destaca o dia selecionado", async () => {
    setup("2026-10-03");
    await open();
    expect(screen.getAllByRole("button", { name: /^October 3, 2026/ })[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("marca hoje e não deixa choose days futuros", async () => {
    setup();
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("button", { name: /November 15, 2026 \(today\)/ })).toHaveAttribute("aria-current", "date");
    expect(screen.getByRole("button", { name: /November 16, 2026/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
  });

  it("volta meses com a seta", async () => {
    setup();
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByText("September 2026")).toBeInTheDocument();
  });

  it("o nome do mês abre a escolha de ano e mantém o mês", async () => {
    setup();
    await open();
    await userEvent.click(screen.getByRole("button", { name: "October 2026" }));
    const years = screen.getByRole("dialog", { name: "Choose year" });
    expect(screen.getByRole("button", { name: "2026" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "2027" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "2019" }));
    expect(years).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "October 2019" })).toBeInTheDocument();
  });

  it("Esc fecha só a escolha de ano", async () => {
    setup();
    await open();
    await userEvent.click(screen.getByRole("button", { name: "October 2026" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Choose year" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Choose day" })).toBeInTheDocument();
  });
});
