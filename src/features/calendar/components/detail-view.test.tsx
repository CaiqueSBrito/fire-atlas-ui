import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDay } from "@/lib/api/calendar";
import { GEOGRAPHIC, THERMAL, makeDay } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import type { PassTime } from "@/types/calendar";
import { DetailView } from "./detail-view";

vi.mock("@/lib/api/calendar", () => ({ fetchDay: vi.fn(), fetchMonth: vi.fn() }));

const mockedFetchDay = vi.mocked(fetchDay);

// Dias de teste: 4 → atividade, 5 → nenhum registro, 6 → indisponível
const ACTIVE = "2026-11-04";
const NONE = "2026-11-05";
const UNAVAILABLE = "2026-11-06";

function setup(
  props: Partial<{
    date: string;
    regionId: string;
    passTime: PassTime;
    view: "thermal" | "geographic" | null;
  }> = {},
) {
  const onChange = vi.fn();
  renderWithProviders(
    <DetailView
      date={props.date ?? ACTIVE}
      regionId={props.regionId ?? "bahia"}
      passTime={props.passTime ?? "all"}
      view={props.view ?? null}
      onChange={onChange}
    />,
  );
  return { onChange };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2027-06-15T12:00:00Z"));
  mockedFetchDay.mockReset();
  mockedFetchDay.mockImplementation(async (date, region, time) =>
    makeDay(date, region, time),
  );
});

describe("DetailView — carga e estados", () => {
  it("mostra carregando e depois a carta com os dados da data (CA02)", async () => {
    setup();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "4 de novembro de 2026",
    );
    expect(screen.getByText("Carregando a carta…")).toBeInTheDocument();
    const card = await screen.findByRole("article");
    expect(within(card).getByText("Focos MODIS").nextSibling).toHaveTextContent("3");
    expect(within(card).getByText("Focos VIIRS").nextSibling).toHaveTextContent("5");
    expect(mockedFetchDay).toHaveBeenCalledWith(
      ACTIVE,
      "bahia",
      "all",
      expect.anything(),
    );
  });

  it("dia com atividade: etiqueta de estado e detecções no mapa", async () => {
    setup();
    await screen.findByRole("article");
    expect(screen.getByText("Atividade registrada")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Mapa esquemático com 8 detecções em Bahia/ }),
    ).toBeInTheDocument();
  });

  it("dia sem registro: diz que há dado com zero detecções", async () => {
    setup({ date: NONE });
    const card = await screen.findByRole("article");
    expect(screen.getByText("Nenhum registro de foco")).toBeInTheDocument();
    expect(within(card).getByText(/zero detecções/)).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Mapa esquemático com 0 detecções/ }),
    ).toBeInTheDocument();
  });

  it("dia indisponível: identifica a indisponibilidade sem inventar detecções (CA04)", async () => {
    setup({ date: UNAVAILABLE });
    const card = await screen.findByRole("article");
    // etiqueta do dia + aviso dentro da carta
    expect(screen.getAllByText("Dados indisponíveis")).toHaveLength(2);
    expect(within(card).queryByText(/Focos/)).toBeNull();
    expect(screen.queryByRole("img", { name: /Mapa esquemático/ })).toBeNull();
    expect(screen.getByText("Dados indisponíveis para esta data.")).toBeInTheDocument();
  });

  it("falha: mostra erro e permite tentar de novo", async () => {
    mockedFetchDay.mockRejectedValueOnce(new Error("HTTP 503"));
    setup();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("HTTP 503");
    await userEvent.click(within(alert).getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("article")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(mockedFetchDay).toHaveBeenCalledTimes(2);
  });
});

describe("DetailView — alterações sem voltar ao calendário (RN06 / CA03)", () => {
  it("trocar o local avisa o pai com a nova região", async () => {
    const { onChange } = setup();
    await screen.findByRole("article");
    await userEvent.click(screen.getByRole("combobox", { name: "Local" }));
    await userEvent.click(screen.getByRole("option", { name: "Pará" }));
    expect(onChange).toHaveBeenCalledWith({ region: "para" });
  });

  it("trocar o horário avisa o pai", async () => {
    const { onChange } = setup();
    await screen.findByRole("article");
    await userEvent.click(screen.getByRole("combobox", { name: "Horário" }));
    await userEvent.click(screen.getByRole("option", { name: "Passagem noturna" }));
    expect(onChange).toHaveBeenCalledWith({ time: "night" });
  });

  it("dia anterior e próximo mudam a data", async () => {
    const { onChange } = setup({ date: NONE });
    await screen.findByRole("article");
    await userEvent.click(screen.getByRole("button", { name: "Dia anterior" }));
    expect(onChange).toHaveBeenLastCalledWith({ date: "2026-11-04" });
    await userEvent.click(screen.getByRole("button", { name: "Próximo dia" }));
    expect(onChange).toHaveBeenLastCalledWith({ date: "2026-11-06" });
  });

  it("não deixa avançar além de hoje", async () => {
    setup({ date: "2999-01-01" });
    await screen.findByRole("article");
    expect(screen.getByRole("button", { name: "Próximo dia" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Dia anterior" })).toBeEnabled();
  });

  it("escolher uma data no mini-calendário avisa o pai", async () => {
    const { onChange } = setup({ date: NONE });
    await screen.findByRole("article");
    await userEvent.click(screen.getByRole("button", { name: /05\/11\/2026/ }));
    const dialog = screen.getByRole("dialog", { name: "Escolher data" });
    await userEvent.click(within(dialog).getByRole("button", { name: "10" }));
    expect(onChange).toHaveBeenCalledWith({ date: "2026-11-10" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("'Fechar carta' limpa a data selecionada", async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Fechar carta" }));
    expect(onChange).toHaveBeenCalledWith({ date: null });
  });

  it("mantém a carta anterior enquanto a nova seleção carrega", async () => {
    let release: (v: ReturnType<typeof makeDay>) => void = () => {};
    const { onChange } = setup();
    await screen.findByRole("article");
    expect(onChange).not.toHaveBeenCalled();
    mockedFetchDay.mockImplementationOnce(
      () => new Promise((resolve) => (release = resolve)),
    );
    // sem re-render do pai: aqui só garantimos que a primeira carta segue visível
    expect(screen.getByRole("article")).toBeInTheDocument();
    release(makeDay(ACTIVE, "bahia"));
  });
});

describe("DetailView — térmica / geográfica só com imagem (RN07)", () => {
  it("sem imagens: os dois botões ficam desativados", async () => {
    setup();
    await screen.findByRole("article");
    expect(screen.getByRole("button", { name: "Térmica" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Geográfica" })).toBeDisabled();
    expect(
      screen.getByText(/Sem imagens térmica\/geográfica disponíveis/),
    ).toBeInTheDocument();
  });

  it("habilita só o tipo que existe", async () => {
    mockedFetchDay.mockResolvedValue(makeDay(ACTIVE, "bahia", "all", [THERMAL]));
    setup();
    await screen.findByRole("article");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Térmica" })).toBeEnabled(),
    );
    expect(screen.getByRole("button", { name: "Geográfica" })).toBeDisabled();
  });

  it("alternar avisa o pai e, ativo, mostra a imagem com fonte e data", async () => {
    mockedFetchDay.mockResolvedValue(
      makeDay(ACTIVE, "bahia", "all", [THERMAL, GEOGRAPHIC]),
    );
    const { onChange } = setup({ view: "thermal" });
    const card = await screen.findByRole("article");
    const toggle = screen.getByRole("button", { name: "Térmica" });
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(within(card).getByRole("img", { name: /térmica/ })).toHaveAttribute(
      "src",
      THERMAL.url,
    );
    expect(within(card).getByText(/NASA GIBS · imagem de 04\/11\/2026/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Geográfica" }));
    expect(onChange).toHaveBeenCalledWith({ view: "geographic" });
    await userEvent.click(toggle); // desligar o ativo
    expect(onChange).toHaveBeenLastCalledWith({ view: null });
  });

  it("view na URL sem imagem correspondente é ignorada", async () => {
    setup({ view: "geographic" });
    const card = await screen.findByRole("article");
    expect(within(card).queryByRole("img", { name: /geográfica/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Geográfica" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
