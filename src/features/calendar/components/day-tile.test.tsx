import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { MonthDay } from "@/types/calendar";
import { DayTile, sensorCounts } from "./day-tile";

function setup(day: MonthDay, props: { selected?: boolean; isToday?: boolean } = {}) {
  const onSelect = vi.fn();
  render(
    <DayTile
      day={day}
      index={0}
      isToday={props.isToday ?? false}
      selected={props.selected ?? false}
      onSelect={onSelect}
    />,
  );
  return { onSelect, button: screen.getByRole("button") };
}

describe("DayTile — estados da data (RN07)", () => {
  it("atividade registrada: rótulo com a contagem de cada sensor", () => {
    const { button } = setup({
      date: "2026-11-05",
      status: "activity",
      counts: { MODIS: 16, VIIRS: 44 },
    });
    expect(button).toHaveAccessibleName(
      "5 de novembro de 2026: Atividade registrada, 16 focos MODIS, 44 focos VIIRS",
    );
  });

  it("mostra a contagem de cada sensor separadamente na carta", () => {
    const { button } = setup({
      date: "2026-11-05",
      status: "activity",
      counts: { MODIS: 16, VIIRS: 44 },
    });
    const modis = button.querySelector('[data-sensor="MODIS"]');
    const viirs = button.querySelector('[data-sensor="VIIRS"]');
    expect(modis).toHaveTextContent("◆16");
    expect(viirs).toHaveTextContent("●44");
  });

  it("só mostra o sensor que a API informou", () => {
    const { button } = setup({
      date: "2026-11-05",
      status: "activity",
      counts: { VIIRS: 7 },
    });
    expect(button.querySelector('[data-sensor="MODIS"]')).toBeNull();
    expect(button.querySelector('[data-sensor="VIIRS"]')).toHaveTextContent("●7");
    expect(button).toHaveAccessibleName(/7 focos VIIRS/);
    expect(button).not.toHaveAccessibleName(/MODIS/);
  });

  it("sem contagem da API: não inventa números", () => {
    const { button } = setup({ date: "2026-11-05", status: "activity" });
    expect(button.querySelector("[data-sensor]")).toBeNull();
    expect(button).toHaveAccessibleName(
      "5 de novembro de 2026: Atividade registrada",
    );
  });

  it("sem registro: dado disponível com zero focos, sem contagem", () => {
    const { button } = setup({ date: "2026-11-06", status: "none" });
    expect(button).toHaveAccessibleName(
      "6 de novembro de 2026: Nenhum registro de foco",
    );
    expect(button.querySelector("[data-sensor]")).toBeNull();
    expect(button).toHaveAttribute("data-status", "none");
  });

  it("indisponível: identifica a indisponibilidade e ignora contagens", () => {
    const { button } = setup({
      date: "2026-11-07",
      status: "unavailable",
      counts: { MODIS: 99 }, // dado incoerente da API não deve aparecer
    });
    expect(button).toHaveAccessibleName(
      "7 de novembro de 2026: Dados indisponíveis",
    );
    expect(button.querySelector("[data-sensor]")).toBeNull();
    expect(button).toHaveAttribute("data-status", "unavailable");
  });

  it("os três estados têm rótulos diferentes (não dependem só de cor)", () => {
    const names = (["activity", "none", "unavailable"] as const).map((status) => {
      const { unmount } = render(
        <DayTile
          day={{ date: "2026-11-05", status }}
          index={0}
          isToday={false}
          selected={false}
          onSelect={() => {}}
        />,
      );
      const name = screen.getByRole("button").getAttribute("aria-label");
      unmount();
      return name;
    });
    expect(new Set(names).size).toBe(3);
  });
});

describe("DayTile — interação", () => {
  it("clique seleciona a data", async () => {
    const { onSelect, button } = setup({ date: "2026-11-05", status: "none" });
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith("2026-11-05");
  });

  it("teclado: Enter e Espaço selecionam", async () => {
    const { onSelect, button } = setup({ date: "2026-11-05", status: "none" });
    button.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("carta selecionada fica virada e marcada", () => {
    const { button } = setup(
      { date: "2026-11-05", status: "none" },
      { selected: true },
    );
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("data-flipped", "true");
  });

  it("carta não selecionada fica de costas", () => {
    const { button } = setup({ date: "2026-11-05", status: "none" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveAttribute("data-flipped", "false");
  });

  it("marca o dia de hoje", () => {
    const { button } = setup(
      { date: "2026-11-12", status: "none" },
      { isToday: true },
    );
    expect(button).toHaveAttribute("aria-current", "date");
    expect(button).toHaveAccessibleName(/\(hoje\)/);
  });

  it("verso mostra o número do dia com dois dígitos", () => {
    const { button } = setup({ date: "2026-11-05", status: "none" });
    expect(button).toHaveTextContent("05");
  });
});

describe("sensorCounts", () => {
  it("ordena MODIS antes de VIIRS e omite o que não veio", () => {
    expect(
      sensorCounts({
        date: "2026-11-05",
        status: "activity",
        counts: { VIIRS: 2, MODIS: 1 },
      }),
    ).toEqual([
      { sensor: "MODIS", count: 1 },
      { sensor: "VIIRS", count: 2 },
    ]);
    expect(sensorCounts({ date: "2026-11-05", status: "activity" })).toEqual([]);
  });

  it("mantém sensor com contagem zero informada", () => {
    expect(
      sensorCounts({
        date: "2026-11-05",
        status: "activity",
        counts: { MODIS: 0, VIIRS: 3 },
      }),
    ).toEqual([
      { sensor: "MODIS", count: 0 },
      { sensor: "VIIRS", count: 3 },
    ]);
  });
});
