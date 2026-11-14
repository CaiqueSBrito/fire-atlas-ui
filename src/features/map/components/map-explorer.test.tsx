import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { imageryDateFor } from "@/lib/map-layers";
import { fetchDetections } from "@/lib/api/detections";
import { detection, detectionsResponse } from "@/test/detection-fixtures";
import { useDrawMode } from "@/providers/draw-mode";
import { renderWithProviders } from "@/test/render";
import { MapExplorer } from "./map-explorer";

const HEX_A = { id: "hexA", res: 4, count: 20, modis: 5, viirs: 15, center: [-50, -10], edgeKm: 26.1 };
const HEX_B = { id: "hexB", res: 4, count: 7, modis: 7, viirs: 0, center: [-48, -12], edgeKm: 26.1 };

vi.mock("@/lib/api/detections", () => ({
  fetchDetections: vi.fn(),
  fetchStats: vi.fn(),
}));

vi.mock("./fire-map-loader", () => {
  const Stub = (p: {
    detections: unknown[];
    showMatches: boolean;
    drawing: boolean;
    basemap: string;
    showHeat: boolean;
    imageryDate: string;
    plot: string;
    showPoints: boolean;
    onSelect: (id: string | null) => void;
    selectedHex: string | null;
    onHexSelect: (cell: unknown) => void;
    onHexChange: (info: unknown) => void;
    introFly: boolean;
    focus3d: { lon: number; lat: number; zoom?: number } | null;
    projection: string;
    continentPicking: boolean;
    onContinentPick: (id: string) => void;
    onContinentHover: (id: string | null) => void;
    onViewport: (bbox: number[]) => void;
  }) => (
    <div
      data-testid="fire-map"
      data-count={p.detections.length}
      data-matches={String(p.showMatches)}
      data-drawing={String(p.drawing)}
      data-base={p.basemap}
      data-heat={String(p.showHeat)}
      data-date={p.imageryDate}
      data-plot={p.plot}
      data-points={String(p.showPoints)}
      data-selected-hex={p.selectedHex ?? ""}
      data-intro={String(p.introFly)}
      data-focus3d={p.focus3d ? `${p.focus3d.lon},${p.focus3d.lat}` : ""}
      data-focus-zoom={p.focus3d?.zoom ?? ""}
      data-projection={p.projection}
      data-picking={String(p.continentPicking)}
    >
      <button
        type="button"
        onClick={() => {
          p.onHexChange({ res: 4, edgeKm: 26.1, max: 20, cells: 2, top: [HEX_A, HEX_B] });
          p.onHexSelect(HEX_A);
        }}
      >
        emitir-hex
      </button>
      <button type="button" onClick={() => p.onSelect("viirs-1")}>
        emitir-ponto
      </button>
      <button type="button" onClick={() => p.onSelect(null)}>
        emitir-vazio
      </button>
      <button type="button" onClick={() => p.onContinentHover("south-america")}>
        emitir-hover
      </button>
      <button type="button" onClick={() => p.onViewport([-60, -20, -40, 0])}>
        emitir-viewport
      </button>
      <button type="button" onClick={() => p.onContinentPick("south-america")}>
        emitir-continente
      </button>

    </div>
  );
  return { FireMap: Stub };
});

const mocked = vi.mocked(fetchDetections);

beforeEach(() => {
  mocked.mockReset();
});

describe("MapExplorer — estados (RN05)", () => {
  it("mostra carregamento enquanto consulta", () => {
    mocked.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<MapExplorer />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando detecções…");
  });

  it("repassa os pontos ao mapa e resume o recorte", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    expect(await screen.findByText(/3 detecções no recorte/)).toBeInTheDocument();
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-count", "3");
  });

  it("consulta com os filtros da URL (CA02)", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, {
      searchParams: "?sensors=viirs&from=2026-03-01&to=2026-03-10&bbox=-60,-10,-50,0",
    });
    await screen.findByText(/detecções no recorte/);
    expect(mocked.mock.calls[0][0]).toEqual({
      sensors: ["viirs"],
      from: "2026-03-01",
      to: "2026-03-10",
      bbox: [-60, -10, -50, 0],
    });
  });

  it("ausência de registros não afirma ausência de fogo (CA04)", async () => {
    mocked.mockResolvedValue(detectionsResponse({ items: [], total: 0 }));
    renderWithProviders(<MapExplorer />);
    expect(
      await screen.findByText("Nenhuma detecção registrada neste recorte"),
    ).toBeInTheDocument();
    expect(screen.getByText(/não significa que não houve fogo/)).toBeInTheDocument();
  });

  it("falha recuperável oferece nova tentativa que repete a consulta", async () => {
    mocked.mockRejectedValueOnce(new ApiError("Servidor fora do ar"));
    mocked.mockResolvedValueOnce(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Servidor fora do ar");
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText(/3 detecções no recorte/)).toBeInTheDocument();
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it("falha não recuperável não oferece nova tentativa", async () => {
    mocked.mockRejectedValue(new ApiError("Acesso negado", 403, false));
    renderWithProviders(<MapExplorer />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Acesso negado");
    expect(screen.queryByRole("button", { name: "Tentar novamente" })).not.toBeInTheDocument();
  });

  it("filtro inválido não consulta e explica o problema", async () => {
    renderWithProviders(<MapExplorer />, { searchParams: "?from=2026-05-10&to=2026-05-01" });
    expect(await screen.findByText("Filtro inválido")).toBeInTheDocument();
    expect(mocked).not.toHaveBeenCalled();
  });

  it("indica quando os pontos foram truncados", async () => {
    mocked.mockResolvedValue(detectionsResponse({ total: 9000, truncated: true }));
    renderWithProviders(<MapExplorer />);
    expect(await screen.findByText(/Exibindo 3 pontos/)).toBeInTheDocument();
  });

  it("sinaliza dados simulados e mantém o aviso de que ponto ausente não prova ausência de fogo", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    expect(await screen.findByText(/Protótipo: Fonte de teste/)).toBeInTheDocument();
    expect(screen.getByText(/não comprova ausência de incêndio/)).toBeInTheDocument();
  });
});

describe("MapExplorer — detalhes (RN04/CA03)", () => {
  it("seleciona na lista, mostra os atributos e fecha", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    await userEvent.click(screen.getByRole("button", { name: /120 MW/ }));
    const detail = screen.getByRole("region", { name: /Detecção VIIRS/ });
    expect(detail).toHaveTextContent("-10.5000°, -55.2500°");
    expect(detail).toHaveTextContent("120 MW");
    expect(detail).toHaveTextContent("NOAA-20");
    expect(detail).toHaveTextContent("Fonte de teste — simulado");
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("region", { name: /Detecção VIIRS/ })).not.toBeInTheDocument();
  });

  it("FRP ausente aparece como 'Não informado'", async () => {
    mocked.mockResolvedValue(
      detectionsResponse({ items: [detection({ id: "x", frp: null })] }),
    );
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    await userEvent.click(screen.getAllByRole("button", { name: /Não informado/ })[0]);
    expect(screen.getByRole("region", { name: /Detecção MODIS/ })).toHaveTextContent("Não informado");
  });
});

describe("MapExplorer — correspondências (RN06)", () => {
  const withMatch = detection({ id: "m", matchId: "viirs-9" });

  it("não destaca nem mostra correspondência sem harmonização validada", async () => {
    mocked.mockResolvedValue(detectionsResponse({ items: [withMatch] }));
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-matches", "false");
    expect(screen.queryByText(/Correspondência entre sensores/)).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: /MW/ })[0]);
    expect(screen.queryByText("Correspondência")).not.toBeInTheDocument();
  });

  it("destaca e detalha quando a harmonização validada está disponível", async () => {
    mocked.mockResolvedValue(
      detectionsResponse({ items: [withMatch], harmonization: { available: true } }),
    );
    renderWithProviders(<MapExplorer />);
    await waitFor(() =>
      expect(screen.getByTestId("fire-map")).toHaveAttribute("data-matches", "true"),
    );
    expect(screen.getByText(/Correspondência entre sensores/)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: /MW/ })[0]);
    expect(screen.getByText("Correspondência")).toBeInTheDocument();
    expect(screen.getByText(/viirs-9/)).toBeInTheDocument();
  });
});

function DrawTrigger() {
  const { setDrawing } = useDrawMode();
  return (
    <button type="button" onClick={() => setDrawing(true)}>
      iniciar-desenho
    </button>
  );
}

describe("MapExplorer — desenho de área", () => {
  it("o modo de desenho vem do modal de filtros e mostra a instrução no mapa", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(
      <>
        <DrawTrigger />
        <MapExplorer />
      </>,
    );
    await screen.findByText(/detecções no recorte/);
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-drawing", "false");
    expect(screen.queryByText(/Arraste no mapa para desenhar a área/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "iniciar-desenho" }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-drawing", "true");
    expect(screen.getByText(/Arraste no mapa para desenhar a área/)).toBeInTheDocument();
  });

  it("cancelar encerra o desenho", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(
      <>
        <DrawTrigger />
        <MapExplorer />
      </>,
    );
    await screen.findByText(/detecções no recorte/);
    await userEvent.click(screen.getByRole("button", { name: "iniciar-desenho" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-drawing", "false");
  });

  it("a barra lateral não tem mais o formulário de área (fica no modal de filtros)", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    expect(screen.queryByRole("button", { name: /Desenhar área/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Oeste/)).not.toBeInTheDocument();
  });
});

describe("MapExplorer — camadas do mapa", () => {
  it("começa no mapa de ruas, sem calor", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    const map = await screen.findByTestId("fire-map");
    expect(map).toHaveAttribute("data-base", "streets");
    expect(map).toHaveAttribute("data-heat", "false");
  });

  it("lê as camadas da URL", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, {
      searchParams: "?base=illustrated&heat=true",
    });
    const map = await screen.findByTestId("fire-map");
    expect(map).toHaveAttribute("data-base", "illustrated");
    expect(map).toHaveAttribute("data-heat", "true");
  });

  it("o mapa começa em ruas e o interruptor alterna o mapa ilustrado", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-base", "streets");
    expect(screen.queryByRole("radio", { name: /Satélite/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch", { name: /Mapa ilustrado/ }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-base", "illustrated");
    expect(screen.getByText(/decorativos/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch", { name: /Mapa ilustrado/ }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-base", "streets");
  });

  it("liga o mapa de calor e mostra a legenda", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    await userEvent.click(screen.getByRole("switch", { name: /Mapa de calor/ }));
    const map = screen.getByTestId("fire-map");
    expect(map).toHaveAttribute("data-heat", "true");
    expect(screen.getByText("Mapa de calor (densidade de focos)")).toBeInTheDocument();
  });

  it("trocar de camada não refaz a consulta de detecções", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    await userEvent.click(screen.getByRole("switch", { name: /Mapa ilustrado/ }));
    await userEvent.click(screen.getByRole("switch", { name: /Mapa de calor/ }));
    expect(mocked).toHaveBeenCalledTimes(1);
  });

  it("a data das imagens da NASA acompanha o fim do período (limitada ao atraso)", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?from=2026-03-01&to=2026-03-10" });
    expect(await screen.findByTestId("fire-map")).toHaveAttribute("data-date", "2026-03-10");
  });

  it("período recente usa a imagem mais recente disponível", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    expect(await screen.findByTestId("fire-map")).toHaveAttribute("data-date", imageryDateFor());
  });

});

describe("MapExplorer — hexágonos H3", () => {
  it("começa em pontos e mostra a lista de detecções", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    const map = screen.getByTestId("fire-map");
    expect(map).toHaveAttribute("data-plot", "points");
    expect(screen.getByText("Detecções de maior FRP")).toBeInTheDocument();
    expect(screen.queryByText("Hexágonos com mais focos")).not.toBeInTheDocument();
  });

  it("lê o modo da URL e troca para hexágonos pelo painel", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    await userEvent.click(screen.getByRole("radio", { name: /Hexágonos \(H3\)/ }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-plot", "hex");
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-points", "true");
    expect(screen.getByText("Detecções de maior FRP")).toBeInTheDocument();
  });

  it("não refaz a consulta ao trocar de pontos para hexágonos", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    await userEvent.click(screen.getByRole("radio", { name: /Hexágonos \(H3\)/ }));
    expect(mocked).toHaveBeenCalledTimes(1);
  });

  it("mostra a escala e a lista dos hexágonos com mais focos", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex" });
    await userEvent.click(await screen.findByRole("button", { name: "emitir-hex" }));
    expect(screen.getByText("Focos por hexágono (H3, resolução 4)")).toBeInTheDocument();
    expect(screen.getByText("Hexágonos com mais focos")).toBeInTheDocument();
  });

  it("selecionar um hexágono mostra o detalhe no topo do painel, com a contagem por sensor", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex" });
    await userEvent.click(await screen.findByRole("button", { name: "emitir-hex" }));
    const detail = screen.getByRole("region", { name: "Hexágono H3" });
    expect(detail).toHaveTextContent("Focos na célula20");
    expect(detail).toHaveTextContent("◆ MODIS5");
    expect(detail).toHaveTextContent("● VIIRS15");
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-selected-hex", "hexA");
    const aside = screen.getByRole("complementary", { name: "Painel do mapa" });
    expect(aside.firstElementChild).not.toBe(detail);
    expect(aside.children[1]).toBe(detail);
  });

  it("a lista permite escolher outro hexágono", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex" });
    await userEvent.click(await screen.findByRole("button", { name: "emitir-hex" }));
    const top = screen.getByRole("region", { name: "Hexágonos com mais focos" });
    await userEvent.click(within(top).getAllByRole("button")[1]);
    expect(screen.getByRole("region", { name: "Hexágono H3" })).toHaveTextContent("Focos na célula7");
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-selected-hex", "hexB");
  });

  it("fechar o detalhe limpa a seleção do hexágono", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex" });
    await userEvent.click(await screen.findByRole("button", { name: "emitir-hex" }));
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("region", { name: "Hexágono H3" })).not.toBeInTheDocument();
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-selected-hex", "");
  });

  it("o detalhe de uma detecção também aparece no topo do painel", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    await userEvent.click(screen.getByRole("button", { name: /120 MW/ }));
    const detail = screen.getByRole("region", { name: /Detecção VIIRS/ });
    const aside = screen.getByRole("complementary", { name: "Painel do mapa" });
    expect(aside.children[1]).toBe(detail);
  });
});

describe("MapExplorer — pontos sobre os hexágonos", () => {
  it("no modo H3 os pontos continuam visíveis por padrão", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex" });
    expect(await screen.findByTestId("fire-map")).toHaveAttribute("data-points", "true");
  });

  it("a opção de pontos só aparece junto com os hexágonos", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    expect(screen.queryByRole("switch", { name: /Mostrar pontos sobre os hexágonos/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /Hexágonos \(H3\)/ }));
    expect(screen.getByRole("switch", { name: /Mostrar pontos sobre os hexágonos/ })).toBeChecked();
  });

  it("desligar os pontos esconde a lista de detecções e mantém só os hexágonos", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex" });
    await screen.findByText("Detecções de maior FRP");
    await userEvent.click(screen.getByRole("switch", { name: /Mostrar pontos sobre os hexágonos/ }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-points", "false");
    expect(screen.queryByText("Detecções de maior FRP")).not.toBeInTheDocument();
  });

  it("lê a opção de pontos da URL", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex&dots=false" });
    expect(await screen.findByTestId("fire-map")).toHaveAttribute("data-points", "false");
  });

  it("clicar num ponto mostra o detalhe da detecção e troca o detalhe do hexágono", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex" });
    await userEvent.click(await screen.findByRole("button", { name: "emitir-hex" }));
    expect(screen.getByRole("region", { name: "Hexágono H3" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "emitir-ponto" }));
    expect(screen.getByRole("region", { name: /Detecção VIIRS/ })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Hexágono H3" })).not.toBeInTheDocument();
  });

  it("clicar num hexágono depois troca de volta para o detalhe da célula", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex" });
    await userEvent.click(await screen.findByRole("button", { name: "emitir-ponto" }));
    expect(screen.getByRole("region", { name: /Detecção VIIRS/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "emitir-hex" }));
    expect(screen.getByRole("region", { name: "Hexágono H3" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Detecção VIIRS/ })).not.toBeInTheDocument();
  });

  it("escolher uma detecção na lista também limpa o hexágono selecionado", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex" });
    await userEvent.click(await screen.findByRole("button", { name: "emitir-hex" }));
    const list = screen.getByRole("region", { name: "Detecções de maior FRP" });
    await userEvent.click(within(list).getAllByRole("button")[0]);
    expect(screen.queryByRole("region", { name: "Hexágono H3" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Detecção/ })).toBeInTheDocument();
  });
});

describe("MapExplorer — vista 3D e voo de entrada", () => {
  const twoPoints = () =>
    detectionsResponse({
      items: [
        detection({ id: "a", lat: -12, lon: -45, frp: 100 }),
        detection({ id: "b", sensor: "viirs", lat: 5, lon: 20, frp: 50 }),
      ],
    });

  const listButtons = () =>
    within(screen.getByRole("region", { name: "Detecções de maior FRP" })).getAllByRole("button");

  afterEach(() => {
    sessionStorage.clear();
  });

  it("sem região o mapa começa como globo e aceita escolher um continente", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    const map = screen.getByTestId("fire-map");
    expect(map).toHaveAttribute("data-projection", "globe");
    expect(map).toHaveAttribute("data-picking", "true");
    expect(screen.getByText("Clique em um continente para explorar")).toBeInTheDocument();
  });

  it("passar o mouse sobre um continente mostra o nome", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />);
    await userEvent.click(await screen.findByRole("button", { name: "emitir-hover" }));
    expect(screen.getByText("Clique para explorar: América do Sul")).toBeInTheDocument();
  });

  it("clicar no continente sai do globo e abre o mapa 2D da região", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />);
    await userEvent.click(await screen.findByRole("button", { name: "emitir-continente" }));
    await waitFor(() =>
      expect(screen.getByTestId("fire-map")).toHaveAttribute("data-projection", "mercator"),
    );
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-picking", "false");
    expect(screen.queryByText(/Clique em um continente/)).not.toBeInTheDocument();
  });

  it("com região na URL o mapa abre em 2D, sem globo e sem botão de vista 3D", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />, { searchParams: "?region=south-america" });
    await screen.findByText(/detecções no recorte/);
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-projection", "mercator");
    expect(screen.queryByRole("button", { name: /Vista 3D/ })).not.toBeInTheDocument();
  });

  it("'Voltar ao globo' limpa a região e volta para o globo", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />, { searchParams: "?region=south-america" });
    await screen.findByText(/detecções no recorte/);
    await userEvent.click(screen.getByRole("button", { name: "Voltar ao globo" }));
    await waitFor(() =>
      expect(screen.getByTestId("fire-map")).toHaveAttribute("data-projection", "globe"),
    );
    expect(screen.queryByRole("button", { name: "Voltar ao globo" })).not.toBeInTheDocument();
  });

  it("área desenhada mantém o mapa plano mesmo sem região", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />, { searchParams: "?bbox=-60,-20,-40,0" });
    await screen.findByText(/detecções no recorte/);
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-projection", "mercator");
  });

  it("selecionar um ponto inclina e foca automaticamente", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />, { searchParams: "?region=south-america" });
    await screen.findByText(/detecções no recorte/);
    await userEvent.click(listButtons()[0]);
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-focus3d", "-45,-12");
    expect(screen.getByRole("button", { name: "Voltar ao 2D" })).toBeInTheDocument();
  });

  it("'Voltar ao 2D' desfaz a inclinação e 'Ver em 3D' refaz", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />, { searchParams: "?region=south-america" });
    await screen.findByText(/detecções no recorte/);
    await userEvent.click(listButtons()[0]);
    await userEvent.click(screen.getByRole("button", { name: "Voltar ao 2D" }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-focus3d", "");
    await userEvent.click(screen.getByRole("button", { name: "Ver em 3D" }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-focus3d", "-45,-12");
  });

  it("fechar o detalhe ou clicar no vazio volta ao 2D", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />, { searchParams: "?region=south-america" });
    await screen.findByText(/detecções no recorte/);
    await userEvent.click(listButtons()[0]);
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-focus3d", "");
    await userEvent.click(listButtons()[0]);
    await userEvent.click(screen.getByRole("button", { name: "emitir-vazio" }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-focus3d", "");
  });

  it("trocar de detecção acompanha o novo ponto", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />, { searchParams: "?region=south-america" });
    await screen.findByText(/detecções no recorte/);
    await userEvent.click(listButtons()[0]);
    await userEvent.click(listButtons()[1]);
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-focus3d", "20,5");
  });

  it("escolher um hexágono inclina e foca no centro da célula com zoom da resolução", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />, { searchParams: "?region=south-america&plot=hex&dots=false" });
    await userEvent.click(await screen.findByRole("button", { name: "emitir-hex" }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-focus3d", "-50,-10");
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-focus-zoom", "7");
    expect(screen.getByRole("region", { name: "Hexágono H3" })).toBeInTheDocument();
  });

  it("sem a marca do globo o mapa abre direto, sem voo", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />);
    expect(await screen.findByTestId("fire-map")).toHaveAttribute("data-intro", "false");
  });

  it("vindo do globo o mapa faz o voo de entrada e consome a marca", async () => {
    sessionStorage.setItem("fire-atlas:intro-fly", "1");
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />);
    expect(await screen.findByTestId("fire-map")).toHaveAttribute("data-intro", "true");
    await waitFor(() => expect(sessionStorage.getItem("fire-atlas:intro-fly")).toBeNull());
  });

  it("a região vinda do globo enquadra o mapa no continente", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />, { searchParams: "?region=south-america" });
    await screen.findByText(/detecções no recorte/);
    expect(mocked.mock.calls[0][0].bbox).toEqual([-82, -56, -34, 13]);
  });
});

describe("MapExplorer — painel lateral", () => {
  it("oculta e mostra o painel lateral", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    await userEvent.click(screen.getByRole("button", { name: "Ocultar painel" }));
    expect(screen.queryByRole("complementary", { name: "Painel do mapa" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mostrar painel" }));
    expect(screen.getByRole("complementary", { name: "Painel do mapa" })).toBeInTheDocument();
  });
});

describe("MapExplorer — calendário", () => {
  it("o botão de calendário leva a região, o dia e o enquadramento atual do mapa", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, {
      searchParams: "?region=south-america&from=2026-11-08&to=2026-11-14",
    });
    await screen.findByText(/detecções no recorte/);
    const link = screen.getByRole("link", { name: /Abrir o calendário/ });
    expect(link.getAttribute("href")).toBe(
      "/explore/calendar?region=south-america&date=2026-11-14",
    );
    await userEvent.click(screen.getByRole("button", { name: "emitir-viewport" }));
    expect(screen.getByRole("link", { name: /Abrir o calendário/ }).getAttribute("href")).toBe(
      "/explore/calendar?region=south-america&date=2026-11-14&bbox=-60%2C-20%2C-40%2C0",
    );
  });

  it("o link do calendário leva as camadas ativas do mapa", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, {
      searchParams: "?region=south-america&to=2026-11-14&heat=true&plot=hex&dots=false&base=illustrated",
    });
    await screen.findByText(/detecções no recorte/);
    const href = screen.getByRole("link", { name: /Abrir o calendário/ }).getAttribute("href")!;
    const q = new URLSearchParams(href.split("?")[1]);
    expect(q.get("base")).toBe("illustrated");
    expect(q.get("plot")).toBe("hex");
    expect(q.get("dots")).toBe("false");
    expect(q.get("heat")).toBe("true");
  });
});
