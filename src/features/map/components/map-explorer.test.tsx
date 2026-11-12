import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { imageryDateFor } from "@/lib/map-layers";
import { fetchDetections } from "@/lib/api/detections";
import { fetchTemperatureGrid } from "@/lib/api/temperature";
import { detection, detectionsResponse, temperatureGrid } from "@/test/detection-fixtures";
import { renderWithProviders } from "@/test/render";
import { MapExplorer } from "./map-explorer";

vi.mock("@/lib/api/detections", () => ({
  fetchDetections: vi.fn(),
  fetchStats: vi.fn(),
}));

vi.mock("@/lib/api/temperature", () => ({
  fetchTemperatureGrid: vi.fn(),
  temperatureEndpoint: vi.fn(),
}));

vi.mock("./fire-map-loader", () => ({
  FireMap: (p: {
    detections: unknown[];
    showMatches: boolean;
    drawing: boolean;
    basemap: string;
    showHeat: boolean;
    showTemperature: boolean;
    imageryDate: string;
    temperature: unknown;
  }) => (
    <div
      data-testid="fire-map"
      data-count={p.detections.length}
      data-matches={String(p.showMatches)}
      data-drawing={String(p.drawing)}
      data-base={p.basemap}
      data-heat={String(p.showHeat)}
      data-temp={String(p.showTemperature)}
      data-date={p.imageryDate}
      data-has-temp={String(Boolean(p.temperature))}
    />
  ),
}));

const mocked = vi.mocked(fetchDetections);
const temperatureMock = vi.mocked(fetchTemperatureGrid);

beforeEach(() => {
  mocked.mockReset();
  temperatureMock.mockReset();
  temperatureMock.mockResolvedValue(temperatureGrid());
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

describe("MapExplorer — desenho de área", () => {
  it("alterna o modo de desenho no mapa", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-drawing", "false");
    await userEvent.click(screen.getByRole("button", { name: /Desenhar área/ }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-drawing", "true");
  });

  it("aplicar coordenadas válidas refaz a consulta com a nova área", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    const west = screen.getByLabelText(/Oeste/);
    await userEvent.clear(west);
    await userEvent.type(west, "-100");
    await userEvent.click(screen.getByRole("button", { name: "Aplicar coordenadas" }));
    await waitFor(() => expect(mocked).toHaveBeenCalledTimes(2));
    expect(mocked.mock.calls[1][0].bbox).toEqual([-100, -60, 180, 80]);
  });
});

describe("MapExplorer — camadas do mapa", () => {
  it("começa no satélite, sem calor nem temperatura", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    const map = await screen.findByTestId("fire-map");
    expect(map).toHaveAttribute("data-base", "satellite");
    expect(map).toHaveAttribute("data-heat", "false");
    expect(map).toHaveAttribute("data-temp", "false");
  });

  it("lê as camadas da URL", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, {
      searchParams: "?base=illustrated&heat=true&temp=true",
    });
    const map = await screen.findByTestId("fire-map");
    expect(map).toHaveAttribute("data-base", "illustrated");
    expect(map).toHaveAttribute("data-heat", "true");
    expect(map).toHaveAttribute("data-temp", "true");
  });

  it("troca entre satélite, vegetação e ilustrado", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    await userEvent.click(screen.getByRole("radio", { name: /Satélite \+ vegetação/ }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-base", "vegetation");
    expect(screen.getByText("Vegetação (NDVI, MODIS)")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /Ilustrado/ }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-base", "illustrated");
    expect(screen.getByText(/decorativos/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /^Satélite(?! \+)/ }));
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-base", "satellite");
  });

  it("liga o mapa de calor e a temperatura e mostra as legendas", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    await userEvent.click(screen.getByRole("checkbox", { name: /Mapa de calor/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Temperatura da superfície/ }));
    const map = screen.getByTestId("fire-map");
    expect(map).toHaveAttribute("data-heat", "true");
    expect(map).toHaveAttribute("data-temp", "true");
    expect(screen.getByText("Mapa de calor (densidade de focos)")).toBeInTheDocument();
    expect(screen.getByText("≥ 43 °C")).toBeInTheDocument();
  });

  it("trocar de camada não refaz a consulta de detecções", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    await userEvent.click(screen.getByRole("radio", { name: /Ilustrado/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Mapa de calor/ }));
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

  it("só consulta a temperatura quando a camada está ligada", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />);
    await screen.findByText(/detecções no recorte/);
    expect(temperatureMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-has-temp", "false");
    await userEvent.click(screen.getByRole("checkbox", { name: /Temperatura da superfície/ }));
    await waitFor(() =>
      expect(screen.getByTestId("fire-map")).toHaveAttribute("data-has-temp", "true"),
    );
    expect(temperatureMock).toHaveBeenCalledTimes(1);
  });

  it("consulta a temperatura do fim do período sobre a área do mapa", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    renderWithProviders(<MapExplorer />, {
      searchParams: "?temp=true&to=2026-03-10&from=2026-03-01&bbox=-60,-10,-50,0",
    });
    await waitFor(() => expect(temperatureMock).toHaveBeenCalled());
    const [axes, date] = temperatureMock.mock.calls[0];
    expect(date).toBe("2026-03-10");
    expect(axes.lons[0]).toBeLessThanOrEqual(-60);
    expect(axes.lons.at(-1)!).toBeGreaterThanOrEqual(-50);
    expect(axes.lats[0]).toBeGreaterThanOrEqual(0);
  });

  it("mostra o carregamento e depois o dia da temperatura", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    let release: (v: ReturnType<typeof temperatureGrid>) => void = () => {};
    temperatureMock.mockReturnValue(new Promise((r) => (release = r)));
    renderWithProviders(<MapExplorer />, { searchParams: "?temp=true" });
    expect(await screen.findByText("Carregando temperatura…")).toBeInTheDocument();
    release(temperatureGrid());
    expect(await screen.findByText(/Temperatura máxima do ar em/)).toBeInTheDocument();
    expect(screen.queryByText("Carregando temperatura…")).not.toBeInTheDocument();
  });

  it("falha da temperatura é informada e pode ser repetida", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    temperatureMock.mockRejectedValueOnce(new ApiError("Serviço fora do ar"));
    temperatureMock.mockRejectedValueOnce(new ApiError("Serviço fora do ar"));
    temperatureMock.mockResolvedValueOnce(temperatureGrid());
    renderWithProviders(<MapExplorer />, { searchParams: "?temp=true" });
    expect(await screen.findByText("Serviço fora do ar", {}, { timeout: 4000 })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() =>
      expect(screen.getByTestId("fire-map")).toHaveAttribute("data-has-temp", "true"),
    );
  }, 15000);

  it("limite de consultas não dispara nova tentativa automática", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    temperatureMock.mockRejectedValue(
      new ApiError("O limite de consultas de temperatura foi atingido.", 429),
    );
    renderWithProviders(<MapExplorer />, { searchParams: "?temp=true" });
    expect(await screen.findByText(/limite de consultas/)).toBeInTheDocument();
    expect(temperatureMock).toHaveBeenCalledTimes(1);
  });

  it("a falha da temperatura não derruba as detecções no mapa", async () => {
    mocked.mockResolvedValue(detectionsResponse());
    temperatureMock.mockRejectedValue(new ApiError("Serviço fora do ar"));
    renderWithProviders(<MapExplorer />, { searchParams: "?temp=true" });
    expect(await screen.findByText(/3 detecções no recorte/)).toBeInTheDocument();
    expect(screen.getByTestId("fire-map")).toHaveAttribute("data-count", "3");
  });
});
