import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDrawMode } from "@/providers/draw-mode";
import { renderWithProviders } from "@/test/render";
import { FilterBar } from "./filter-bar";

const TODAY = "2026-11-14";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
});
afterEach(() => vi.useRealTimers());

const lastQuery = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)?.[0].queryString as string;

const openModal = async () => {
  await userEvent.click(screen.getByRole("button", { name: /^Filters/ }));
  return screen.getByRole("dialog", { name: "Filters" });
};

function DrawProbe() {
  const { drawing } = useDrawMode();
  return <p data-testid="drawing">{String(drawing)}</p>;
}

describe("FilterBar — resumo", () => {
  it("conta os filtros em uso e mostra cada um com opção de remover", () => {
    renderWithProviders(<FilterBar />, {
      searchParams: "?sensors=viirs&region=brasil&from=2026-03-01&to=2026-03-10",
    });
    expect(screen.getByRole("button", { name: "Filters (3)" })).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Active filters" });
    expect(within(list).getByText("Brazil")).toBeInTheDocument();
  });

  it("indica área personalizada quando há bbox válido", () => {
    renderWithProviders(<FilterBar />, { searchParams: "?bbox=-60,-10,-50,0" });
    expect(screen.getByText("Custom area")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters (1)" })).toBeInTheDocument();
  });

  it("o período abre um calendário e o dia escolhido substitui o intervalo do mapa", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, { searchParams: "?from=2026-11-01&to=2026-11-07", onUrlUpdate });
    await userEvent.click(screen.getByRole("button", { name: /choose map day/ }));
    const calendar = screen.getByRole("dialog", { name: "Choose day" });
    await userEvent.click(within(calendar).getByRole("button", { name: /^November 12, 2026/ }));
    expect(lastQuery(onUrlUpdate)).toBe("?date=2026-11-12");
    expect(screen.queryByRole("dialog", { name: "Choose day" })).not.toBeInTheDocument();
  });

  it("o local abre os continentes e a escolha substitui a área desenhada", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, { searchParams: "?bbox=-60,-10,-50,0", onUrlUpdate });
    await userEvent.click(screen.getByRole("button", { name: "Custom area" }));
    const picker = screen.getByRole("dialog", { name: "Choose continent" });
    expect(within(picker).getAllByRole("radio").map((r) => r.textContent)).toEqual([
      "World", "North America", "South America", "Europe", "Africa", "Asia", "Oceania",
    ]);
    await userEvent.click(within(picker).getByRole("radio", { name: "Africa" }));
    expect(lastQuery(onUrlUpdate)).toBe("?region=africa");
    expect(screen.queryByRole("dialog", { name: "Choose continent" })).not.toBeInTheDocument();
  });
  it("remover um filtro do resumo limpa só ele na URL", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, {
      searchParams: "?sensors=viirs&region=brasil",
      onUrlUpdate,
    });
    await userEvent.click(screen.getByRole("button", { name: "Remove location filter" }));
    expect(lastQuery(onUrlUpdate)).toBe("?sensors=viirs");
  });

  it("'Limpar filtros' restaura o padrão", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, {
      searchParams: "?sensors=viirs&region=brasil&from=2026-03-01&date=2026-03-05",
      onUrlUpdate,
    });
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(lastQuery(onUrlUpdate)).toBe("");
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });
});

describe("FilterBar — modal de filtros", () => {
  it("abre com todas as seções e fecha com Esc, sem aplicar nada", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, { onUrlUpdate });
    const dialog = await openModal();
    for (const title of ["Sensors", "Location", "Custom area", "Period"]) {
      expect(within(dialog).getByRole("heading", { name: title })).toBeInTheDocument();
    }
    await userEvent.click(within(dialog).getByRole("radio", { name: "Brazil" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onUrlUpdate).not.toHaveBeenCalled();
  });

  it("começa com os valores atuais dos filtros", async () => {
    renderWithProviders(<FilterBar />, {
      searchParams: "?sensors=viirs&region=brasil&from=2026-10-01&to=2026-10-31",
    });
    const dialog = await openModal();
    expect(within(dialog).getByRole("checkbox", { name: /MODIS/ })).not.toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: /VIIRS/ })).toBeChecked();
    expect(within(dialog).getByRole("radio", { name: "Brazil" })).toHaveAttribute("aria-checked", "true");
    expect(within(dialog).getByRole("button", { name: "Custom" })).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).getByLabelText("From")).toHaveValue("2026-10-01");
    expect(within(dialog).getByLabelText("To")).toHaveValue("2026-10-31");
  });

  it("aplica sensores, local e período de uma vez", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, { onUrlUpdate });
    const dialog = await openModal();
    await userEvent.click(within(dialog).getByRole("checkbox", { name: /MODIS/ }));
    await userEvent.click(within(dialog).getByRole("radio", { name: "Brazil" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Last 30 days" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    const query = lastQuery(onUrlUpdate);
    expect(query).toContain("sensors=viirs");
    expect(query).toContain("region=brasil");
    expect(query).toContain("from=2026-10-16");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("atalhos de período: este mês e este ano", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, { onUrlUpdate });
    let dialog = await openModal();
    await userEvent.click(within(dialog).getByRole("button", { name: "This month" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(lastQuery(onUrlUpdate)).toContain("from=2026-11-01");
    dialog = await openModal();
    await userEvent.click(within(dialog).getByRole("button", { name: "This year" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(lastQuery(onUrlUpdate)).toContain("from=2026-01-01");
  });

  it("'Últimos 7 dias' é o padrão e não suja a URL", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, { searchParams: "?from=2026-10-01&to=2026-10-31", onUrlUpdate });
    const dialog = await openModal();
    await userEvent.click(within(dialog).getByRole("button", { name: "Last 7 days" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(lastQuery(onUrlUpdate)).toBe("");
  });

  it("período personalizado invertido ou longo demais bloqueia o Aplicar", async () => {
    renderWithProviders(<FilterBar />);
    const dialog = await openModal();
    await userEvent.click(within(dialog).getByRole("button", { name: "Custom" }));
    fireEvent.change(within(dialog).getByLabelText("From"), { target: { value: "2024-01-01" } });
    expect(within(dialog).getByRole("alert")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("o local oferece mundo, continentes e Brasil sem regiões estaduais", async () => {
    renderWithProviders(<FilterBar />);
    const dialog = await openModal();
    expect(within(dialog).getAllByRole("radio")).toHaveLength(8);
    for (const name of ["World", "North America", "South America", "Europe", "Africa", "Asia", "Oceania", "Brazil"]) {
      expect(within(dialog).getByRole("radio", { name })).toBeInTheDocument();
    }
    for (const name of ["Amazonas", "Pará", "Mato Grosso", "Tocantins", "Maranhão", "Bahia", "Minas Gerais"]) {
      expect(within(dialog).queryByRole("radio", { name })).not.toBeInTheDocument();
    }
  });

  it("busca filtra as regiões disponíveis e permite selecionar o resultado", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, { onUrlUpdate });
    let dialog = await openModal();
    await userEvent.type(within(dialog).getByRole("searchbox", { name: "Search regions" }), "brazi");
    expect(within(dialog).getAllByRole("radio")).toHaveLength(1);
    await userEvent.click(within(dialog).getByRole("radio", { name: "Brazil" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(lastQuery(onUrlUpdate)).toContain("region=brasil");
    dialog = await openModal();
    await userEvent.clear(within(dialog).getByRole("searchbox", { name: "Search regions" }));
    await userEvent.type(within(dialog).getByRole("searchbox", { name: "Search regions" }), "zzz");
    expect(within(dialog).queryAllByRole("radio")).toHaveLength(0);
  });

  it("coordenadas válidas viram a área personalizada e substituem a região", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, { searchParams: "?region=brasil", onUrlUpdate });
    const dialog = await openModal();
    await userEvent.click(within(dialog).getByRole("button", { name: "Enter coordinates" }));
    const west = within(dialog).getByLabelText(/West/);
    await userEvent.clear(west);
    await userEvent.type(west, "-60");
    for (const [label, value] of [["South", "-10"], ["East", "-50"], ["North", "0"]] as const) {
      const input = within(dialog).getByLabelText(new RegExp(label));
      await userEvent.clear(input);
      await userEvent.type(input, value);
    }
    await userEvent.click(within(dialog).getByRole("button", { name: "Use this area" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    const query = lastQuery(onUrlUpdate);
    expect(query).toContain("bbox=-60,-10,-50,0");
    expect(query).not.toContain("region=");
    expect(query).not.toContain("from=");
    expect(query).not.toContain("to=");
  });

  it("coordenadas inválidas mostram o erro e não entram no rascunho", async () => {
    renderWithProviders(<FilterBar />);
    const dialog = await openModal();
    await userEvent.click(within(dialog).getByRole("button", { name: "Enter coordinates" }));
    const north = within(dialog).getByLabelText(/North/);
    await userEvent.clear(north);
    await userEvent.type(north, "95");
    await userEvent.click(within(dialog).getByRole("button", { name: "Use this area" }));
    expect(within(dialog).getByRole("alert")).toBeInTheDocument();
    expect(within(dialog).queryByText(/^-?\d/)).not.toBeInTheDocument();
  });

  it("'Desenhar no mapa' só existe na página do mapa e inicia o desenho", async () => {
    renderWithProviders(
      <>
        <DrawProbe />
        <FilterBar canDraw />
      </>,
    );
    const dialog = await openModal();
    await userEvent.click(within(dialog).getByRole("button", { name: "Draw on map" }));
    expect(screen.getByTestId("drawing")).toHaveTextContent("true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });


  it("'Limpar' do modal volta o rascunho ao padrão e só vale ao aplicar", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, {
      searchParams: "?sensors=viirs&region=brasil&from=2026-10-01",
      onUrlUpdate,
    });
    const dialog = await openModal();
    await userEvent.click(within(dialog).getByRole("button", { name: "Clear" }));
    expect(within(dialog).getByRole("checkbox", { name: /MODIS/ })).toBeChecked();
    expect(within(dialog).getByRole("radio", { name: "World" })).toHaveAttribute("aria-checked", "true");
    expect(onUrlUpdate).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(lastQuery(onUrlUpdate)).toBe("");
  });
});
