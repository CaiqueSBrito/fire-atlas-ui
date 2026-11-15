import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { HarmonizedMonthly } from "@/types/stats";
import { HarmonizedMonthlyPanel, monthLabel } from "./harmonized-monthly";

const DATA: HarmonizedMonthly = {
  unitLabel: "Atividade de fogo harmonizada (células ativas equivalentes ao MODIS Aqua)",
  warnings: ["Meses recentes sao dados NRT (quase em tempo real) e podem mudar."],
  months: [
    { month: "2026-09", value: 1200.5, daysWithData: 30, daysInMonth: 30, complete: true },
    { month: "2026-10", value: null, daysWithData: 0, daysInMonth: 31, complete: true },
    { month: "2026-11", value: 300, daysWithData: 14, daysInMonth: 30, complete: false },
  ],
};

describe("HarmonizedMonthlyPanel", () => {
  it("sem API configurada não mostra nada", () => {
    const { container } = render(
      <HarmonizedMonthlyPanel data={null} isPending={false} error={null} onRetry={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("uma barra por mês, com unidade obrigatória e tabela equivalente", () => {
    const { container } = render(
      <HarmonizedMonthlyPanel data={DATA} isPending={false} error={null} onRetry={() => {}} />,
    );
    expect(container.querySelectorAll("[data-month]")).toHaveLength(3);
    expect(screen.getByText(/não é número de focos/)).toHaveTextContent("equivalentes ao MODIS Aqua");
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("1.200,5");
    expect(rows[2]).toHaveTextContent("sem dado");
    expect(rows[3]).toHaveTextContent("(em andamento)");
    expect(rows[3]).toHaveTextContent("14/30");
  });

  it("mês sem dado não vira zero", () => {
    const { container } = render(
      <HarmonizedMonthlyPanel data={DATA} isPending={false} error={null} onRetry={() => {}} />,
    );
    expect(container.querySelector('[data-month="2026-10"] title')).toHaveTextContent("sem dado");
  });

  it("todos os meses sem dado mostra indisponível", () => {
    render(
      <HarmonizedMonthlyPanel
        data={{ ...DATA, months: DATA.months.map((m) => ({ ...m, value: null, daysWithData: 0 })) }}
        isPending={false}
        error={null}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText(/Falta de dado não significa ausência de fogo/)).toBeInTheDocument();
  });

  it("falha permite tentar novamente", async () => {
    const onRetry = vi.fn();
    render(<HarmonizedMonthlyPanel data={undefined} isPending={false} error={new Error("x")} onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("rótulo do mês curto e com o ano", () => {
    expect(monthLabel("2026-11")).toMatch(/\/26$/);
  });
});
