import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { peekIntroFly } from "@/lib/utils/intro-fly";
import type { CountryCollection, Ring } from "@/lib/utils/countries";
import { HeroGlobe } from "./hero-globe";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const square = (w: number, s: number, e: number, n: number): Ring => [
  [w, s],
  [e, s],
  [e, n],
  [w, n],
  [w, s],
];

const countries: CountryCollection = {
  features: [
    {
      properties: { name: "Brasilia", continent: "South America" },
      geometry: { type: "Polygon", coordinates: [square(-70, -30, -40, 5)] },
    },
    {
      properties: { name: "Savana", continent: "Africa" },
      geometry: { type: "Polygon", coordinates: [square(10, -20, 40, 20)] },
    },
  ],
};

vi.mock("@/lib/utils/countries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/utils/countries")>()),
  loadCountries: vi.fn(() => Promise.resolve(countries)),
}));

type Handlers = {
  onPick?: (lat: number, lon: number) => void;
  onHover?: (point: { lat: number; lon: number } | null) => void;
};

let handlers: Handlers = {};

vi.mock("./globe-loader", () => ({
  GlobeLoader: (props: Handlers) => {
    handlers = props;
    return <div data-testid="globe" />;
  },
}));

let now = 1000;

beforeEach(() => {
  push.mockReset();
  handlers = {};
  now = 1000;
  vi.spyOn(performance, "now").mockImplementation(() => now);
});

afterEach(() => {
  sessionStorage.clear();
  document.body.style.cursor = "";
  vi.restoreAllMocks();
});

async function ready() {
  render(<HeroGlobe />);
  await act(async () => {
    await Promise.resolve();
  });
}

describe("HeroGlobe", () => {
  it("o globo é decorativo e fica fora da árvore de acessibilidade", async () => {
    await ready();
    expect(screen.getByTestId("globe").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("clicar na América do Sul abre o mapa já nessa região e marca o voo de entrada (CA01)", async () => {
    await ready();
    act(() => handlers.onPick!(-10, -55));
    expect(push).toHaveBeenCalledWith("/explore/map?region=south-america");
    expect(peekIntroFly()).toBe(true);
  });

  it("clicar na África abre a região da África", async () => {
    await ready();
    act(() => handlers.onPick!(0, 25));
    expect(push).toHaveBeenCalledWith("/explore/map?region=africa");
  });

  it("clicar no oceano não navega nem marca o voo", async () => {
    await ready();
    act(() => handlers.onPick!(0, -30));
    expect(push).not.toHaveBeenCalled();
    expect(peekIntroFly()).toBe(false);
  });

  it("passar o mouse mostra o continente sob o cursor e muda o cursor", async () => {
    await ready();
    act(() => handlers.onHover!({ lat: -10, lon: -55 }));
    expect(screen.getByText(/Clique para explorar:/)).toHaveTextContent("América do Sul");
    expect(document.body.style.cursor).toBe("pointer");
  });

  it("sair do globo ou passar sobre o oceano esconde o rótulo", async () => {
    await ready();
    act(() => handlers.onHover!({ lat: -10, lon: -55 }));
    now = 2000;
    act(() => handlers.onHover!({ lat: 0, lon: -30 }));
    expect(screen.queryByText(/Clique para explorar:/)).not.toBeInTheDocument();
    expect(document.body.style.cursor).toBe("");
    now = 3000;
    act(() => handlers.onHover!({ lat: 0, lon: 25 }));
    expect(screen.getByText(/Clique para explorar:/)).toHaveTextContent("África");
    act(() => handlers.onHover!(null));
    expect(screen.queryByText(/Clique para explorar:/)).not.toBeInTheDocument();
  });

  it("limita a frequência da detecção ao mover o mouse", async () => {
    await ready();
    act(() => handlers.onHover!({ lat: -10, lon: -55 }));
    now = 1010;
    act(() => handlers.onHover!({ lat: 0, lon: 25 }));
    expect(screen.getByText(/Clique para explorar:/)).toHaveTextContent("América do Sul");
  });

  it("antes dos dados carregarem, clicar não navega", async () => {
    render(<HeroGlobe />);
    act(() => handlers.onPick!(-10, -55));
    expect(push).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId("globe")).toBeInTheDocument());
  });
});
