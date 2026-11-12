import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDay, fetchMonth } from "@/lib/api/calendar";
import { makeDay, makeMonth } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import { CalendarView } from "./calendar-view";

vi.mock("@/lib/api/calendar", () => ({ fetchDay: vi.fn(), fetchMonth: vi.fn() }));

const mockedMonth = vi.mocked(fetchMonth);
const mockedDay = vi.mocked(fetchDay);

// Mês de teste: dia 4 → atividade, 5 → nenhum registro, 6 → indisponível
function setup(searchParams = "month=2026-11") {
  const onUrlUpdate = vi.fn();
  renderWithProviders(<CalendarView />, { searchParams, onUrlUpdate });
  const lastUrl = () => {
    const calls = onUrlUpdate.mock.calls;
    return calls[calls.length - 1]?.[0].searchParams as URLSearchParams | undefined;
  };
  return { onUrlUpdate, lastUrl };
}

const tile = (day: number) =>
  screen.getByRole("button", {
    name: new RegExp(`^${day} de novembro de 2026`),
  });

beforeEach(() => {
  // Só a data é falsa (os timers reais seguem): "hoje" fixo e posterior ao mês
  // de teste, para os testes não dependerem do relógio da máquina.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2027-06-15T12:00:00Z"));
  mockedMonth.mockReset();
  mockedDay.mockReset();
  mockedMonth.mockImplementation(async (m, r) => makeMonth(m, r));
  mockedDay.mockImplementation(async (d, r, t) => makeDay(d, r, t));
});

describe("CA01 — abertura: o painel exibe as cartas das datas", () => {
  it("lista uma carta por dia do mês e o título do mês", async () => {
    setup();
    expect(screen.getByRole("complementary", { name: "Calendário de queimadas" }))
      .toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /^1 de novembro/ })).toBeInTheDocument();
    const days = screen.getAllByRole("button", { name: /de novembro de 2026/ });
    expect(days).toHaveLength(30);
    expect(screen.getByText("Novembro de 2026", { selector: "span" })).toBeInTheDocument();
    expect(mockedMonth).toHaveBeenCalledWith("2026-11", "brasil", expect.anything());
  });

  it("sem data selecionada, mostra o estado vazio convidativo", async () => {
    setup();
    await screen.findByRole("button", { name: /^1 de novembro/ });
    expect(
      screen.getByRole("heading", { level: 1, name: "Calendário de queimadas" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver a carta de hoje" })).toBeInTheDocument();
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("diferencia atividade, sem registro e indisponível nas cartas", async () => {
    setup();
    await screen.findByRole("button", { name: /^1 de novembro/ });
    expect(tile(4)).toHaveAccessibleName(/Atividade registrada, 16 focos MODIS, 44 focos VIIRS/);
    expect(tile(5)).toHaveAccessibleName(/Nenhum registro de foco/);
    expect(tile(6)).toHaveAccessibleName(/Dados indisponíveis/);
  });

  it("resume o mês com a contagem de dias por estado", async () => {
    setup();
    await screen.findByRole("button", { name: /^1 de novembro/ });
    const summary = screen.getByRole("list", { name: "Resumo do mês" });
    // 30 dias: %3==1 → 10 atividade, %3==2 → 10 sem registro, %3==0 → 10 indisponíveis
    expect(within(summary).getAllByText("10 dias")).toHaveLength(3);
  });
});

describe("CA02 — seleção: carta vira e mostra os dados da data", () => {
  it("clicar numa carta vira a carta e abre o detalhe", async () => {
    const { lastUrl } = setup();
    await screen.findByRole("button", { name: /^1 de novembro/ });
    await userEvent.click(tile(4));

    expect(tile(4)).toHaveAttribute("aria-pressed", "true");
    expect(tile(4)).toHaveAttribute("data-flipped", "true");
    expect(tile(5)).toHaveAttribute("data-flipped", "false");

    const card = await screen.findByRole("article");
    expect(card).toHaveAccessibleName("Carta de Brasil em 04/11/2026");
    expect(within(card).getByText("Focos MODIS").nextSibling).toHaveTextContent("3");
    expect(screen.getByRole("heading", { level: 2, name: "4 de novembro de 2026" }))
      .toBeInTheDocument();
    expect(lastUrl()?.get("date")).toBe("2026-11-04");
  });

  it("data indisponível: o detalhe avisa e não inventa detecções (CA04)", async () => {
    setup();
    await screen.findByRole("button", { name: /^1 de novembro/ });
    await userEvent.click(tile(6));
    const card = await screen.findByRole("article");
    expect(within(card).queryByText(/Focos/)).toBeNull();
    expect(screen.getAllByText("Dados indisponíveis").length).toBeGreaterThan(0);
    expect(screen.queryByRole("img", { name: /Mapa esquemático/ })).toBeNull();
  });

  it("abre direto da URL (compartilhável) com data e região", async () => {
    setup("month=2026-11&date=2026-11-04&region=bahia");
    const card = await screen.findByRole("article");
    expect(card).toHaveAccessibleName("Carta de Bahia em 04/11/2026");
    expect(mockedDay).toHaveBeenCalledWith("2026-11-04", "bahia", "all", expect.anything());
  });

  it("ignora data inválida na URL em vez de quebrar", async () => {
    setup("month=2026-11&date=2026-02-31");
    await screen.findByRole("button", { name: /^1 de novembro/ });
    expect(screen.queryByRole("article")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("teclado: Enter numa carta focada abre o detalhe", async () => {
    setup();
    await screen.findByRole("button", { name: /^1 de novembro/ });
    tile(4).focus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByRole("article")).toBeInTheDocument();
  });
});

describe("tela estreita — o detalhe fica abaixo do painel", () => {
  function stubMatchMedia(narrow: boolean) {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query.includes("max-width") ? narrow : false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      })),
    );
  }
  afterEach(() => vi.unstubAllGlobals());

  it("ao escolher uma carta no celular, rola até a carta aberta", async () => {
    stubMatchMedia(true);
    const scroll = vi.mocked(Element.prototype.scrollIntoView);
    scroll.mockClear();
    setup();
    await screen.findByRole("button", { name: /^1 de novembro/ });
    await userEvent.click(tile(4));
    await waitFor(() => expect(scroll).toHaveBeenCalledOnce());
    expect(scroll).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("no desktop não rola a página", async () => {
    stubMatchMedia(false);
    const scroll = vi.mocked(Element.prototype.scrollIntoView);
    scroll.mockClear();
    setup();
    await screen.findByRole("button", { name: /^1 de novembro/ });
    await userEvent.click(tile(4));
    await screen.findByRole("article");
    expect(scroll).not.toHaveBeenCalled();
  });
});

describe("CA03 — atualização sem voltar ao calendário", () => {
  it("trocar o local atualiza a carta, o mapa e a URL; o painel segue visível", async () => {
    const { lastUrl } = setup("month=2026-11&date=2026-11-04");
    await screen.findByRole("article");
    await userEvent.click(screen.getByRole("combobox", { name: "Local" }));
    await userEvent.click(screen.getByRole("option", { name: "Bahia" }));

    await waitFor(() =>
      expect(screen.getByRole("article")).toHaveAccessibleName(
        "Carta de Bahia em 04/11/2026",
      ),
    );
    expect(
      screen.getByRole("img", { name: /Mapa esquemático com 8 detecções em Bahia/ }),
    ).toBeInTheDocument();
    expect(lastUrl()?.get("region")).toBe("bahia");
    // o calendário (região) também é rebuscado para a nova região
    expect(mockedMonth).toHaveBeenCalledWith("2026-11", "bahia", expect.anything());
    expect(tile(4)).toBeInTheDocument();
  });

  it("trocar o horário refaz a consulta do dia", async () => {
    const { lastUrl } = setup("month=2026-11&date=2026-11-04");
    await screen.findByRole("article");
    await userEvent.click(screen.getByRole("combobox", { name: "Horário" }));
    await userEvent.click(screen.getByRole("option", { name: "Passagem diurna" }));
    await waitFor(() =>
      expect(mockedDay).toHaveBeenCalledWith("2026-11-04", "brasil", "day", expect.anything()),
    );
    expect(lastUrl()?.get("time")).toBe("day");
  });

  it("trocar a data (dia seguinte) atualiza a carta e marca a nova carta na grade", async () => {
    const { lastUrl } = setup("month=2026-11&date=2026-11-04");
    await screen.findByRole("article");
    await userEvent.click(screen.getByRole("button", { name: "Próximo dia" }));
    await waitFor(() =>
      expect(screen.getByRole("article")).toHaveAccessibleName(
        "Carta de Brasil em 05/11/2026",
      ),
    );
    expect(tile(5)).toHaveAttribute("aria-pressed", "true");
    expect(tile(4)).toHaveAttribute("aria-pressed", "false");
    expect(lastUrl()?.get("date")).toBe("2026-11-05");
  });

  it("a data trocada para outro mês leva o painel junto", async () => {
    setup("month=2026-11&date=2026-11-30");
    await screen.findByRole("article");
    await userEvent.click(screen.getByRole("button", { name: "Próximo dia" }));
    await waitFor(() =>
      expect(mockedMonth).toHaveBeenCalledWith("2026-12", "brasil", expect.anything()),
    );
    expect(screen.getByText("Dezembro de 2026", { selector: "span" })).toBeInTheDocument();
  });

  it("'Fechar carta' volta ao estado vazio e limpa a data da URL", async () => {
    const { lastUrl } = setup("month=2026-11&date=2026-11-04");
    await screen.findByRole("article");
    await userEvent.click(screen.getByRole("button", { name: "Fechar carta" }));
    expect(screen.queryByRole("article")).toBeNull();
    expect(lastUrl()?.has("date")).toBe(false);
  });
});

describe("RN01 — painel lateral abre e recolhe", () => {
  const wrap = () => document.querySelector(".side-wrap") as HTMLElement;
  const inner = () => document.querySelector(".side-inner") as HTMLElement;

  it("recolhe liberando espaço e reabre pelo botão da pílula", async () => {
    setup();
    await screen.findByRole("button", { name: /^1 de novembro/ });
    expect(wrap()).toHaveAttribute("data-open", "true");
    expect(inner()).not.toHaveAttribute("inert");
    expect(screen.queryByRole("button", { name: "Abrir calendário" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Recolher calendário" }));
    expect(wrap()).toHaveAttribute("data-open", "false");
    // fechado: o teclado e os leitores de tela não entram no painel
    expect(inner()).toHaveAttribute("inert");

    const reopen = screen.getByRole("button", { name: "Abrir calendário" });
    expect(reopen).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(reopen);
    expect(wrap()).toHaveAttribute("data-open", "true");
    expect(inner()).not.toHaveAttribute("inert");
    expect(screen.queryByRole("button", { name: "Abrir calendário" })).toBeNull();
  });

  it("recolher não perde a data selecionada nem o detalhe aberto", async () => {
    setup("month=2026-11&date=2026-11-04");
    await screen.findByRole("article");
    await userEvent.click(screen.getByRole("button", { name: "Recolher calendário" }));
    expect(screen.getByRole("article")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Abrir calendário" }));
    expect(tile(4)).toHaveAttribute("aria-pressed", "true");
  });
});

describe("RN02 — navegação temporal", () => {
  it("mês anterior e próximo", async () => {
    const { lastUrl } = setup();
    await screen.findByRole("button", { name: /^1 de novembro/ });
    await userEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(await screen.findByRole("button", { name: /^1 de dezembro de 2026/ })).toBeInTheDocument();
    expect(lastUrl()?.get("month")).toBe("2026-12");
    await userEvent.click(screen.getByRole("button", { name: "Mês anterior" }));
    await userEvent.click(screen.getByRole("button", { name: "Mês anterior" }));
    expect(await screen.findByRole("button", { name: /^1 de outubro de 2026/ })).toBeInTheDocument();
    expect(lastUrl()?.get("month")).toBe("2026-10");
  });

  it("escolha rápida de mês e ano pelo título", async () => {
    const { lastUrl } = setup();
    await screen.findByRole("button", { name: /^1 de novembro/ });
    await userEvent.click(screen.getByRole("button", { name: /escolher mês e ano/i }));
    const dialog = screen.getByRole("dialog", { name: "Escolher mês e ano" });

    await userEvent.click(within(dialog).getByRole("combobox", { name: "Ano" }));
    await userEvent.click(screen.getByRole("option", { name: "2025" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "mar" }));

    await waitFor(() =>
      expect(mockedMonth).toHaveBeenCalledWith("2025-03", "brasil", expect.anything()),
    );
    expect(lastUrl()?.get("month")).toBe("2025-03");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await screen.findByRole("button", { name: /^1 de março de 2025/ })).toBeInTheDocument();
  });

  it("os anos oferecidos vão de 2000 até o ano seguinte", async () => {
    setup();
    await screen.findByRole("button", { name: /^1 de novembro/ });
    await userEvent.click(screen.getByRole("button", { name: /escolher mês e ano/i }));
    await userEvent.click(screen.getByRole("combobox", { name: "Ano" }));
    const years = screen
      .getAllByRole("option")
      .map((o) => Number(o.textContent?.replace("✓", "")));
    expect(Math.min(...years)).toBe(2000);
    expect(Math.max(...years)).toBe(new Date().getUTCFullYear() + 1);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it("'Ir para o mês atual' fica desativado quando já está nele", async () => {
    const now = new Date().toISOString().slice(0, 7);
    setup(`month=${now}`);
    expect(await screen.findByRole("button", { name: "Ir para o mês atual" })).toBeDisabled();
  });

  it("'Ver a carta de hoje' abre a carta da data de hoje", async () => {
    const { lastUrl } = setup();
    await screen.findByRole("button", { name: /^1 de novembro/ });
    await userEvent.click(screen.getByRole("button", { name: "Ver a carta de hoje" }));
    expect(lastUrl()?.get("date")).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe("RN05 — carregando e erro com nova tentativa", () => {
  it("mostra carregando enquanto busca o mês", async () => {
    mockedMonth.mockImplementation(() => new Promise(() => {}));
    setup();
    expect(screen.getByRole("status")).toHaveTextContent("Carregando o mês…");
    expect(screen.queryByRole("button", { name: /de novembro de 2026/ })).toBeNull();
  });

  it("falha no mês: informa e permite tentar de novo", async () => {
    mockedMonth.mockRejectedValueOnce(new Error("HTTP 500"));
    setup();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("HTTP 500");

    await userEvent.click(within(alert).getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("button", { name: /^1 de novembro/ })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(mockedMonth).toHaveBeenCalledTimes(2);
  });

  it("falha só no dia: o calendário continua utilizável", async () => {
    mockedDay.mockRejectedValueOnce(new Error("HTTP 502"));
    setup("month=2026-11&date=2026-11-04");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("HTTP 502");
    expect(tile(5)).toBeEnabled();
    await userEvent.click(tile(5));
    expect(await screen.findByRole("article")).toBeInTheDocument();
  });
});
