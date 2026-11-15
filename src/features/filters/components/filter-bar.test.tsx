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
  await userEvent.click(screen.getByRole("button", { name: /^Filtros/ }));
  return screen.getByRole("dialog", { name: "Filtros" });
};

function DrawProbe() {
  const { drawing } = useDrawMode();
  return <p data-testid="drawing">{String(drawing)}</p>;
}

describe("FilterBar — resumo", () => {
  it("sem filtros: botão 'Filtros' sem contador, resumo do padrão e sem 'Limpar filtros'", () => {
    renderWithProviders(<FilterBar />);
    expect(screen.getByRole("button", { name: "Filtros" })).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Filtros em uso" });
    expect(within(list).getByText(/MODIS/)).toBeInTheDocument();
    expect(within(list).getByText(/VIIRS/)).toBeInTheDocument();
    expect(within(list).getByText("Mundo")).toBeInTheDocument();
    expect(within(list).getByText("08/11/2026 → 14/11/2026")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remover filtro/ })).not.toBeInTheDocument();
  });

  it("conta os filtros em uso e mostra cada um com opção de remover", () => {
    renderWithProviders(<FilterBar />, {
      searchParams: "?sensors=viirs&region=brasil&from=2026-03-01&to=2026-03-10",
    });
    expect(screen.getByRole("button", { name: "Filtros (3)" })).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Filtros em uso" });
    expect(within(list).getByText("Brasil")).toBeInTheDocument();
    expect(within(list).getByText("01/03/2026 → 10/03/2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remover filtro de sensores" })).toBeInTheDocument();
  });

  it("indica área personalizada quando há bbox válido", () => {
    renderWithProviders(<FilterBar />, { searchParams: "?bbox=-60,-10,-50,0" });
    expect(screen.getByText("Área personalizada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filtros (1)" })).toBeInTheDocument();
  });

  it("usa o dia do calendário como período quando não há from/to", () => {
    renderWithProviders(<FilterBar />, { searchParams: "?date=2026-03-05" });
    expect(screen.getByText("05/03/2026")).toBeInTheDocument();
  });

  it("avisa quando o período está invertido", () => {
    renderWithProviders(<FilterBar />, { searchParams: "?from=2026-03-10&to=2026-03-01" });
    expect(screen.getByRole("alert")).toHaveTextContent("posterior");
  });

  it("remover um filtro do resumo limpa só ele na URL", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, {
      searchParams: "?sensors=viirs&region=brasil",
      onUrlUpdate,
    });
    await userEvent.click(screen.getByRole("button", { name: "Remover filtro de local" }));
    expect(lastQuery(onUrlUpdate)).toBe("?sensors=viirs");
    await userEvent.click(screen.getByRole("button", { name: "Remover filtro de sensores" }));
    expect(lastQuery(onUrlUpdate)).toBe("");
  });

  it("'Limpar filtros' restaura o padrão", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, {
      searchParams: "?sensors=viirs&region=brasil&from=2026-03-01&date=2026-03-05",
      onUrlUpdate,
    });
    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(lastQuery(onUrlUpdate)).toBe("");
    expect(screen.getByRole("button", { name: "Filtros" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();
  });
});

describe("FilterBar — modal de filtros", () => {
  it("abre com todas as seções e fecha com Esc, sem aplicar nada", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, { onUrlUpdate });
    const dialog = await openModal();
    for (const title of ["Sensores", "Local", "Área personalizada", "Período"]) {
      expect(within(dialog).getByRole("heading", { name: title })).toBeInTheDocument();
    }
    await userEvent.click(within(dialog).getByRole("radio", { name: "Brasil" }));
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
    expect(within(dialog).getByRole("radio", { name: "Brasil" })).toHaveAttribute("aria-checked", "true");
    expect(within(dialog).getByRole("button", { name: "Personalizado" })).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).getByLabelText("De")).toHaveValue("2026-10-01");
    expect(within(dialog).getByLabelText("Até")).toHaveValue("2026-10-31");
  });

  it("aplica sensores, local e período de uma vez", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, { onUrlUpdate });
    const dialog = await openModal();
    await userEvent.click(within(dialog).getByRole("checkbox", { name: /MODIS/ }));
    await userEvent.click(within(dialog).getByRole("radio", { name: "Brasil" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Últimos 30 dias" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Aplicar" }));
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
    await userEvent.click(within(dialog).getByRole("button", { name: "Este mês" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Aplicar" }));
    expect(lastQuery(onUrlUpdate)).toContain("from=2026-11-01");
    dialog = await openModal();
    await userEvent.click(within(dialog).getByRole("button", { name: "Este ano" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Aplicar" }));
    expect(lastQuery(onUrlUpdate)).toContain("from=2026-01-01");
  });

  it("'Últimos 7 dias' é o padrão e não suja a URL", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, { searchParams: "?from=2026-10-01&to=2026-10-31", onUrlUpdate });
    const dialog = await openModal();
    await userEvent.click(within(dialog).getByRole("button", { name: "Últimos 7 dias" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Aplicar" }));
    expect(lastQuery(onUrlUpdate)).toBe("");
  });

  it("período personalizado invertido ou longo demais bloqueia o Aplicar", async () => {
    renderWithProviders(<FilterBar />);
    const dialog = await openModal();
    await userEvent.click(within(dialog).getByRole("button", { name: "Personalizado" }));
    fireEvent.change(within(dialog).getByLabelText("De"), { target: { value: "2024-01-01" } });
    expect(within(dialog).getByRole("alert")).toHaveTextContent("período máximo");
    expect(within(dialog).getByRole("button", { name: "Aplicar" })).toBeDisabled();
  });

  it("o local não oferece estados, só mundo, continentes e Brasil", async () => {
    renderWithProviders(<FilterBar />);
    const dialog = await openModal();
    expect(within(dialog).getByRole("radio", { name: "Brasil" })).toBeInTheDocument();
    for (const state of ["Amazonas", "Pará", "Mato Grosso", "Tocantins", "Maranhão", "Bahia", "Minas Gerais"]) {
      expect(within(dialog).queryByRole("radio", { name: state })).not.toBeInTheDocument();
    }
    await userEvent.type(within(dialog).getByRole("searchbox", { name: "Buscar região" }), "amaz");
    expect(within(dialog).getByText("Nenhuma região encontrada.")).toBeInTheDocument();
  });

  it("busca filtra as regiões", async () => {
    renderWithProviders(<FilterBar />);
    const dialog = await openModal();
    await userEvent.type(within(dialog).getByRole("searchbox", { name: "Buscar região" }), "amér");
    expect(within(dialog).getByRole("radio", { name: "América do Sul" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("radio", { name: "Europa" })).not.toBeInTheDocument();
    await userEvent.clear(within(dialog).getByRole("searchbox", { name: "Buscar região" }));
    await userEvent.type(within(dialog).getByRole("searchbox", { name: "Buscar região" }), "zzz");
    expect(within(dialog).getByText("Nenhuma região encontrada.")).toBeInTheDocument();
  });

  it("coordenadas válidas viram a área personalizada e substituem a região", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, { searchParams: "?region=brasil", onUrlUpdate });
    const dialog = await openModal();
    await userEvent.click(within(dialog).getByRole("button", { name: "Digitar coordenadas" }));
    const west = within(dialog).getByLabelText(/Oeste/);
    await userEvent.clear(west);
    await userEvent.type(west, "-60");
    for (const [label, value] of [["Sul", "-10"], ["Leste", "-50"], ["Norte", "0"]] as const) {
      const input = within(dialog).getByLabelText(new RegExp(label));
      await userEvent.clear(input);
      await userEvent.type(input, value);
    }
    await userEvent.click(within(dialog).getByRole("button", { name: "Usar esta área" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Aplicar" }));
    const query = lastQuery(onUrlUpdate);
    expect(query).toContain("bbox=-60,-10,-50,0");
    expect(query).not.toContain("region=");
    expect(query).not.toContain("from=");
    expect(query).not.toContain("to=");
  });

  it("coordenadas inválidas mostram o erro e não entram no rascunho", async () => {
    renderWithProviders(<FilterBar />);
    const dialog = await openModal();
    await userEvent.click(within(dialog).getByRole("button", { name: "Digitar coordenadas" }));
    const north = within(dialog).getByLabelText(/Norte/);
    await userEvent.clear(north);
    await userEvent.type(north, "95");
    await userEvent.click(within(dialog).getByRole("button", { name: "Usar esta área" }));
    expect(within(dialog).getByText(/latitude deve estar entre/)).toBeInTheDocument();
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
    await userEvent.click(within(dialog).getByRole("button", { name: "Desenhar no mapa" }));
    expect(screen.getByTestId("drawing")).toHaveTextContent("true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("fora da página do mapa avisa onde desenhar", async () => {
    renderWithProviders(<FilterBar />);
    const dialog = await openModal();
    expect(within(dialog).queryByRole("button", { name: "Desenhar no mapa" })).not.toBeInTheDocument();
    expect(within(dialog).getByText(/abra a página do Mapa/)).toBeInTheDocument();
  });

  it("'Limpar' do modal volta o rascunho ao padrão e só vale ao aplicar", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, {
      searchParams: "?sensors=viirs&region=brasil&from=2026-10-01",
      onUrlUpdate,
    });
    const dialog = await openModal();
    await userEvent.click(within(dialog).getByRole("button", { name: "Limpar" }));
    expect(within(dialog).getByRole("checkbox", { name: /MODIS/ })).toBeChecked();
    expect(within(dialog).getByRole("radio", { name: "Mundo" })).toHaveAttribute("aria-checked", "true");
    expect(onUrlUpdate).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Aplicar" }));
    expect(lastQuery(onUrlUpdate)).toBe("");
  });

  it("não desativa os sensores sem aviso: deixar nenhum é permitido e informado no resumo", async () => {
    renderWithProviders(<FilterBar />);
    const dialog = await openModal();
    await userEvent.click(within(dialog).getByRole("checkbox", { name: /MODIS/ }));
    await userEvent.click(within(dialog).getByRole("checkbox", { name: /VIIRS/ }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Aplicar" }));
    expect(screen.getByText("Nenhum sensor")).toBeInTheDocument();
  });
});
