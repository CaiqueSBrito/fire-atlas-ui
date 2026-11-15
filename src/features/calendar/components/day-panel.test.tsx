import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ActivityDay } from "@/types/calendar";
import { DayPanel } from "./day-panel";

const UNIT = "Atividade de fogo harmonizada (células ativas equivalentes ao MODIS Aqua)";

const base: ActivityDay = {
  date: "2026-11-13",
  status: "activity",
  value: 200,
  contributing: 2,
  basis: "viirs",
  temperature: [
    { key: "lt320", fromK: null, toK: 320, value: 20 },
    { key: "330", fromK: 330, toK: 340, value: 150 },
    { key: "ge360", fromK: 360, toK: null, value: 30 },
  ],
};

function setup(day: ActivityDay | null, canGoNext = true) {
  render(
    <DayPanel
      day={day}
      unitLabel={UNIT}
      satellites={{ date: "2026-11-13", contributing: ["NOAA-20", "NOAA-21"], available: [] }}
      canGoNext={canGoNext}
      onPrev={vi.fn()}
      onNext={vi.fn()}
    />,
  );
}

describe("DayPanel", () => {
  it("mostra só o valor harmonizado, com a unidade e sem chamar de focos", () => {
    setup(base);
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText(`${UNIT}. Não é número de focos.`)).toBeInTheDocument();
    expect(screen.queryByText(/MODIS ◆|VIIRS ●/)).not.toBeInTheDocument();
    expect(screen.getByText("Satélites que contribuíram").nextElementSibling).toHaveTextContent("NOAA-20,NOAA-21");
    expect(screen.getByText("VIIRS, canal I-4")).toBeInTheDocument();
  });

  it("lista as faixas da mais quente para a mais fria, com a parte de cada uma", () => {
    setup(base);
    const items = within(screen.getByRole("region", { name: "Por temperatura de brilho" })).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(["≥ 360 K3015%", "330–340 K15075%", "< 320 K2010%"]);
  });

  it("sem faixas na fonte avisa em vez de inventar a divisão", () => {
    setup({ ...base, temperature: null });
    expect(screen.getByText("Faixas de temperatura indisponíveis para este dia.")).toBeInTheDocument();
  });

  it("dia sem dado não afirma ausência de fogo", () => {
    setup({ ...base, status: "unavailable", value: null, contributing: 0, basis: null, temperature: null });
    expect(screen.getByText("Sem dado")).toBeInTheDocument();
    expect(screen.getByText(/Isso não significa ausência de fogo/)).toBeInTheDocument();
    expect(screen.queryByText("Atividade harmonizada")).not.toBeInTheDocument();
  });

  it("não deixa avançar além de hoje", () => {
    setup(base, false);
    expect(screen.getByRole("button", { name: "Próximo ›" })).toBeDisabled();
  });
});
