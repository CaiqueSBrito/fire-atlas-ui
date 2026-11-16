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
    expect(screen.getByRole("status")).toHaveTextContent("Loading detections…");
  });

  it("repassa os pontos ao mapa e resume o recorte", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    expect(await screen.findByText(/3 detections in the selected area/)).toBeInTheDocument();
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-count", "3");
  });

  it("consulta com os filtros da URL (CA02)", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, {
      searchParams: "?sensors=viirs&from=2026-03-01&to=2026-03-10&bbox=-60,-10,-50,0",
    });
    await screen.findByText(/detections in the selected area/);
    expect(mocked.mock.calls[0][0]).toEqual({
      sensors: ["viirs"],
      from: "2026-03-01",
      to: "2026-03-10",
      bbox: [-60, -10, -50, 0],
    });
  });


  it("falha recuperável oferece nova tentativa que repete a consulta", async () => {
    mocked.mockRejectedValueOnce(new ApiError("Servidor fora do ar"));
    mocked.mockResolvedValueOnce(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Servidor fora do ar");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/3 detections in the selected area/)).toBeInTheDocument();
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it("falha não recuperável não oferece nova tentativa", async () => {
    mocked.mockRejectedValue(new ApiError("Acesso negado", 403, false));
    renderWithProviders(<MapExplorer />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Acesso negado");
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("filtro inválido não consulta e explica o problema", async () => {
    renderWithProviders(<MapExplorer />, { searchParams: "?from=2026-05-10&to=2026-05-01" });
    expect(await screen.findByText("Invalid filter")).toBeInTheDocument();
    expect(mocked).not.toHaveBeenCalled();
  });

  it("indica quando os pontos foram truncados", async () => {
    mocked.mockResolvedValue(detectionsResponse({ total: 9000, truncated: true }));
    renderWithProviders(<MapExplorer />);
    expect(await screen.findByText(/Showing 3 points/)).toBeInTheDocument();
  });

});

describe("MapExplorer — detalhes (RN04/CA03)", () => {
  it("seleciona na lista, mostra os atributos e fecha", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detections in the selected area/);
    await userEvent.click(screen.getByRole("button", { name: /120 MW/ }));
    const detail = screen.getByRole("region", { name: /Detection VIIRS/ });
    expect(detail).toHaveTextContent("-10.5000°, -55.2500°");
    expect(detail).toHaveTextContent("120 MW");
    expect(detail).toHaveTextContent("NOAA-20");
    expect(detail).toHaveTextContent("Fonte de teste — simulated");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("region", { name: /Detection VIIRS/ })).not.toBeInTheDocument();
  });

});

describe("MapExplorer — correspondências (RN06)", () => {
  const withMatch = detection({ id: "m", matchId: "viirs-9" });

  it("não destaca nem mostra correspondência sem harmonização validada", async () => {
    mocked.mockResolvedValue(detectionsResponse({ items: [withMatch] }));
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detections in the selected area/);
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-matches", "false");
    expect(screen.queryByText(/Cross-sensor match/)).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: /MW/ })[0]);
    expect(screen.queryByText("Match")).not.toBeInTheDocument();
  });

  it("destaca e detalha quando a harmonização validada está disponível", async () => {
    mocked.mockResolvedValue(
      detectionsResponse({ items: [withMatch], harmonization: { available: true } }),
    );
    renderWithProviders(<MapExplorer />);
    await waitFor(() =>
      expect(screen.getByTestId("fire-map")).toHaveAttribute("data-matches", "true"),
    );
    expect(screen.getByText(/Cross-sensor match/)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: /MW/ })[0]);
    expect(screen.getByText("Match")).toBeInTheDocument();
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
    await screen.findByText(/detections in the selected area/);
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-drawing", "false");
    expect(screen.queryByText(/Drag on the map to draw an area/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "iniciar-desenho" }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-drawing", "true");
    expect(screen.getByText(/Drag on the map to draw an area/)).toBeInTheDocument();
  });

  it("cancelar encerra o desenho", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(
      <>
        <DrawTrigger />
        <MapExplorer />
      </>,
    );
    await screen.findByText(/detections in the selected area/);
    await userEvent.click(screen.getByRole("button", { name: "iniciar-desenho" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-drawing", "false");
  });

  it("a barra lateral não tem mais o formulário de área (fica no modal de filtros)", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detections in the selected area/);
    expect(screen.queryByRole("button", { name: /Draw area/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/West/)).not.toBeInTheDocument();
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
    await screen.findByText(/detections in the selected area/);
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-base", "streets");
    expect(screen.queryByRole("radio", { name: /Satellite/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch", { name: /Illustrated map/ }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-base", "illustrated");
    expect(screen.getByText(/decorative/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch", { name: /Illustrated map/ }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-base", "streets");
  });

  it("liga o mapa de calor e mostra a legenda", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detections in the selected area/);
    await userEvent.click(screen.getByRole("switch", { name: /Heatmap/ }));
    const map = screen.getByTestId("fire-map");
    expect(map).toHaveAttribute("data-heat", "true");
    expect(screen.getByText("Heatmap (fire detection density)")).toBeInTheDocument();
  });

  it("trocar de camada não refaz a consulta de detecções", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detections in the selected area/);
    await userEvent.click(screen.getByRole("switch", { name: /Illustrated map/ }));
    await userEvent.click(screen.getByRole("switch", { name: /Heatmap/ }));
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
    await screen.findByText(/detections in the selected area/);
    const map = screen.getByTestId("fire-map");
    expect(map).toHaveAttribute("data-plot", "points");
    expect(screen.getByText("Highest-FRP detections")).toBeInTheDocument();
    expect(screen.queryByText("Hexagons with the most fire detections")).not.toBeInTheDocument();
  });

  it("lê o modo da URL e troca para hexágonos pelo painel", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detections in the selected area/);
    await userEvent.click(screen.getByRole("radio", { name: /Hexagons \(H3\)/ }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-plot", "hex");
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-points", "true");
    expect(screen.getByText("Highest-FRP detections")).toBeInTheDocument();
  });

  it("não refaz a consulta ao trocar de pontos para hexágonos", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detections in the selected area/);
    await userEvent.click(screen.getByRole("radio", { name: /Hexagons \(H3\)/ }));
    expect(mocked).toHaveBeenCalledTimes(1);
  });


  it("selecionar um hexágono mostra o detalhe no topo do painel, com a contagem por sensor", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex" });
    await userEvent.click(await screen.findByRole("button", { name: "emitir-hex" }));
    const detail = screen.getByRole("region", { name: "H3 hexagon" });
    expect(detail).toHaveTextContent("Fire detections in cell20");
    expect(detail).toHaveTextContent("◆ MODIS5");
    expect(detail).toHaveTextContent("● VIIRS15");
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-selected-hex", "hexA");
    const aside = screen.getByRole("complementary", { name: "Map panel" });
    expect(aside.firstElementChild).not.toBe(detail);
    expect(aside.children[1]).toBe(detail);
  });

  it("a lista permite escolher outro hexágono", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex" });
    await userEvent.click(await screen.findByRole("button", { name: "emitir-hex" }));
    const top = screen.getByRole("region", { name: "Hexagons with the most fire detections" });
    await userEvent.click(within(top).getAllByRole("button")[1]);
    expect(screen.getByRole("region", { name: "H3 hexagon" })).toHaveTextContent("Fire detections in cell7");
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-selected-hex", "hexB");
  });

  it("fechar o detalhe limpa a seleção do hexágono", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex" });
    await userEvent.click(await screen.findByRole("button", { name: "emitir-hex" }));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("region", { name: "H3 hexagon" })).not.toBeInTheDocument();
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-selected-hex", "");
  });

  it("o detalhe de uma detecção também aparece no topo do painel", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detections in the selected area/);
    await userEvent.click(screen.getByRole("button", { name: /120 MW/ }));
    const detail = screen.getByRole("region", { name: /Detection VIIRS/ });
    const aside = screen.getByRole("complementary", { name: "Map panel" });
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
    await screen.findByText(/detections in the selected area/);
    expect(screen.queryByRole("switch", { name: /Show points over hexagons/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /Hexagons \(H3\)/ }));
    expect(screen.getByRole("switch", { name: /Show points over hexagons/ })).toBeChecked();
  });

  it("desligar os pontos esconde a lista de detecções e mantém só os hexágonos", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex" });
    await screen.findByText("Highest-FRP detections");
    await userEvent.click(screen.getByRole("switch", { name: /Show points over hexagons/ }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-points", "false");
    expect(screen.queryByText("Highest-FRP detections")).not.toBeInTheDocument();
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
    expect(screen.getByRole("region", { name: "H3 hexagon" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "emitir-ponto" }));
    expect(screen.getByRole("region", { name: /Detection VIIRS/ })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "H3 hexagon" })).not.toBeInTheDocument();
  });

  it("clicar num hexágono depois troca de volta para o detalhe da célula", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex" });
    await userEvent.click(await screen.findByRole("button", { name: "emitir-ponto" }));
    expect(screen.getByRole("region", { name: /Detection VIIRS/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "emitir-hex" }));
    expect(screen.getByRole("region", { name: "H3 hexagon" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Detection VIIRS/ })).not.toBeInTheDocument();
  });

  it("escolher uma detecção na lista também limpa o hexágono selecionado", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex" });
    await userEvent.click(await screen.findByRole("button", { name: "emitir-hex" }));
    const list = screen.getByRole("region", { name: "Highest-FRP detections" });
    await userEvent.click(within(list).getAllByRole("button")[0]);
    expect(screen.queryByRole("region", { name: "H3 hexagon" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Detection/ })).toBeInTheDocument();
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
    within(screen.getByRole("region", { name: "Highest-FRP detections" })).getAllByRole("button");

  afterEach(() => {
    sessionStorage.clear();
  });

  it("sem região o mapa começa como globo e aceita escolher um continente", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detections in the selected area/);
    const map = screen.getByTestId("fire-map");
    expect(map).toHaveAttribute("data-projection", "globe");
    expect(map).toHaveAttribute("data-picking", "true");
    expect(screen.getByText("Click a continent to explore")).toBeInTheDocument();
  });

  it("passar o mouse sobre um continente mostra o nome", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />);
    await userEvent.click(await screen.findByRole("button", { name: "emitir-hover" }));
    expect(screen.getByText("Click to explore: South America")).toBeInTheDocument();
  });

  it("clicar no continente sai do globo e abre o mapa 2D da região", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />);
    await userEvent.click(await screen.findByRole("button", { name: "emitir-continente" }));
    await waitFor(() =>
      expect(screen.getByTestId("fire-map")).toHaveAttribute("data-projection", "mercator"),
    );
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-picking", "false");
    expect(screen.queryByText(/Click a continent/)).not.toBeInTheDocument();
  });

  it("com região na URL o mapa abre em 2D, sem globo e sem botão de vista 3D", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />, { searchParams: "?region=south-america" });
    await screen.findByText(/detections in the selected area/);
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-projection", "mercator");
    expect(screen.queryByRole("button", { name: /3D view/ })).not.toBeInTheDocument();
  });

  it("'Voltar ao globo' limpa a região e volta para o globo", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />, { searchParams: "?region=south-america" });
    await screen.findByText(/detections in the selected area/);
    await userEvent.click(screen.getByRole("button", { name: "Back to globe" }));
    await waitFor(() =>
      expect(screen.getByTestId("fire-map")).toHaveAttribute("data-projection", "globe"),
    );
    expect(screen.queryByRole("button", { name: "Back to globe" })).not.toBeInTheDocument();
  });

  it("área desenhada mantém o mapa plano mesmo sem região", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />, { searchParams: "?bbox=-60,-20,-40,0" });
    await screen.findByText(/detections in the selected area/);
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-projection", "mercator");
  });

  it("selecionar um ponto inclina e foca automaticamente", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />, { searchParams: "?region=south-america" });
    await screen.findByText(/detections in the selected area/);
    await userEvent.click(listButtons()[0]);
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-focus3d", "-45,-12");
    expect(screen.getByRole("button", { name: "Back to 2D" })).toBeInTheDocument();
  });

  it("'Voltar ao 2D' desfaz a inclinação e 'Ver em 3D' refaz", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />, { searchParams: "?region=south-america" });
    await screen.findByText(/detections in the selected area/);
    await userEvent.click(listButtons()[0]);
    await userEvent.click(screen.getByRole("button", { name: "Back to 2D" }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-focus3d", "");
    await userEvent.click(screen.getByRole("button", { name: "View in 3D" }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-focus3d", "-45,-12");
  });

  it("fechar o detalhe ou clicar no vazio volta ao 2D", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />, { searchParams: "?region=south-america" });
    await screen.findByText(/detections in the selected area/);
    await userEvent.click(listButtons()[0]);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-focus3d", "");
    await userEvent.click(listButtons()[0]);
    await userEvent.click(screen.getByRole("button", { name: "emitir-vazio" }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-focus3d", "");
  });

  it("trocar de detecção acompanha o novo ponto", async () => {
    mocked.mockResolvedValue(twoPoints());
    renderWithProviders(<MapExplorer />, { searchParams: "?region=south-america" });
    await screen.findByText(/detections in the selected area/);
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
    expect(screen.getByRole("region", { name: "H3 hexagon" })).toBeInTheDocument();
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
    await screen.findByText(/detections in the selected area/);
    expect(mocked.mock.calls[0][0].bbox).toEqual([-82, -56, -34, 13]);
  });
});

describe("MapExplorer — painel lateral", () => {
  it("oculta e mostra o painel lateral", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detections in the selected area/);
    await userEvent.click(screen.getByRole("button", { name: "Hide panel" }));
    expect(screen.queryByRole("complementary", { name: "Map panel" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show panel" }));
    expect(screen.getByRole("complementary", { name: "Map panel" })).toBeInTheDocument();
  });
});

describe("MapExplorer — calendário", () => {
  it("o botão de calendário leva a região, o dia e o enquadramento atual do mapa", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, {
      searchParams: "?region=south-america&from=2026-11-08&to=2026-11-14",
    });
    await screen.findByText(/detections in the selected area/);
    const link = screen.getByRole("link", { name: /Open the calendar/ });
    expect(link.getAttribute("href")).toBe(
      "/explore/calendar?region=south-america&date=2026-11-14",
    );
    await userEvent.click(screen.getByRole("button", { name: "emitir-viewport" }));
    expect(screen.getByRole("link", { name: /Open the calendar/ }).getAttribute("href")).toBe(
      "/explore/calendar?region=south-america&date=2026-11-14&bbox=-60%2C-20%2C-40%2C0",
    );
  });

  it("o link do calendário leva as camadas ativas do mapa", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, {
      searchParams: "?region=south-america&to=2026-11-14&heat=true&plot=hex&dots=false&base=illustrated",
    });
    await screen.findByText(/detections in the selected area/);
    const href = screen.getByRole("link", { name: /Open the calendar/ }).getAttribute("href")!;
    const q = new URLSearchParams(href.split("?")[1]);
    expect(q.get("base")).toBe("illustrated");
    expect(q.get("plot")).toBe("hex");
    expect(q.get("dots")).toBe("false");
    expect(q.get("heat")).toBe("true");
  });
});
