import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ActivityDay, TemperatureBin } from "@/types/calendar";
import { MonthBars } from "./month-bars";

const bins = (values: number[]): TemperatureBin[] =>
  (
    [
      ["lt320", null, 320],
      ["320", 320, 330],
      ["330", 330, 340],
      ["340", 340, 350],
      ["350", 350, 360],
      ["ge360", 360, null],
      ["none", null, null],
    ] as const
  ).map(([key, fromK, toK], i) => ({ key, fromK, toK, value: values[i] }));

const day = (date: string, patch: Partial<ActivityDay> = {}): ActivityDay => ({
  date,
  status: "activity",
  value: 100,
  contributing: 2,
  basis: "viirs",
  temperature: null,
  ...patch,
});

const DAYS: ActivityDay[] = [
  day("2026-11-01", { value: 200, temperature: bins([10, 40, 80, 40, 20, 10, 0]) }),
  day("2026-11-02", { value: 50, temperature: bins([5, 10, 15, 10, 5, 5, 0]) }),
  day("2026-11-03", { status: "none", value: 0 }),
  day("2026-11-04", { status: "unavailable", value: null, contributing: 0, basis: null }),
];

function setup(days = DAYS, selected: string | null = "2026-11-01") {
  const onSelect = vi.fn();
  render(<MonthBars title="Atividade em novembro" days={days} selected={selected} today="2026-11-04" onSelect={onSelect} />);
  return { onSelect };
}

const bar = (name: RegExp) => screen.getByRole("button", { name });

describe("MonthBars", () => {
  it("a altura da barra é proporcional ao maior dia do mês", () => {
    setup();
    const stack = (b: HTMLElement) => b.querySelector<HTMLElement>("[style*='height']")!;
    expect(stack(bar(/1 de novembro/)).style.height).toBe("100%");
    expect(stack(bar(/2 de novembro/)).style.height).toBe("25%");
  });

  it("separa a barra por faixa de temperatura, da mais fria (embaixo) à mais quente, sem faixas vazias", () => {
    setup();
    const segments = [...bar(/1 de novembro/).querySelectorAll<HTMLElement>("[style*='flex-grow']")];
    expect(segments.map((s) => Number(s.style.flexGrow))).toEqual([10, 40, 80, 40, 20, 10]);
  });

  it("descreve cada faixa em texto, da mais quente para a mais fria", () => {
    setup();
    expect(bar(/1 de novembro/)).toHaveAccessibleName(
      "1 de novembro de 2026: atividade harmonizada 200; ≥ 360 K 10, 350–360 K 20, 340–350 K 40, 330–340 K 80, 320–330 K 40, < 320 K 10",
    );
  });

  it("dia sem dado não vira zero nem ausência de fogo", () => {
    setup();
    const unavailable = bar(/4 de novembro/);
    expect(unavailable).toHaveAccessibleName("4 de novembro de 2026 (hoje): sem dado");
    expect(within(unavailable).getByText("–")).toBeInTheDocument();
    expect(bar(/3 de novembro/)).toHaveAccessibleName("3 de novembro de 2026: atividade harmonizada 0");
    expect(screen.getByText("sem dado (não significa ausência de fogo)")).toBeInTheDocument();
  });

  it("legenda mostra as faixas e avisa quando um dia não tem faixas", () => {
    setup([...DAYS, day("2026-11-05", { value: 80 })]);
    const legend = screen.getByRole("list", { name: "Legenda das barras" });
    expect(within(legend).getByText("≥ 360 K")).toBeInTheDocument();
    expect(within(legend).getByText("< 320 K")).toBeInTheDocument();
    expect(within(legend).getByText("Total (sem faixas de temperatura)")).toBeInTheDocument();
  });

  it("clicar escolhe o dia; o escolhido fica marcado", async () => {
    const { onSelect } = setup();
    expect(bar(/1 de novembro/)).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(bar(/2 de novembro/));
    expect(onSelect).toHaveBeenCalledWith("2026-11-02");
  });
});
