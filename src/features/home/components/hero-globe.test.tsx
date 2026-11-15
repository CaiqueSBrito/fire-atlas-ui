import { act, render, screen } from "@testing-library/react";
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

  it("o globo não leva ao mapa: só o botão principal e o menu fazem isso", async () => {
    await ready();
    expect(handlers.onPick).toBeUndefined();
    expect(push).not.toHaveBeenCalled();
    expect(peekIntroFly()).toBe(false);
    expect(screen.queryByText(/Clique/)).not.toBeInTheDocument();
  });

  it("passar o mouse mostra o nome do continente, sem mudar o cursor", async () => {
    await ready();
    act(() => handlers.onHover!({ lat: -10, lon: -55 }));
    expect(screen.getByTestId("globe-continent")).toHaveTextContent("América do Sul");
    expect(document.body.style.cursor).toBe("");
  });

  it("sair do globo ou passar sobre o oceano esconde o rótulo", async () => {
    await ready();
    act(() => handlers.onHover!({ lat: -10, lon: -55 }));
    now = 2000;
    act(() => handlers.onHover!({ lat: 0, lon: -30 }));
    expect(screen.queryByTestId("globe-continent")).not.toBeInTheDocument();
    now = 3000;
    act(() => handlers.onHover!({ lat: 0, lon: 25 }));
    expect(screen.getByTestId("globe-continent")).toHaveTextContent("África");
    act(() => handlers.onHover!(null));
    expect(screen.queryByTestId("globe-continent")).not.toBeInTheDocument();
  });

  it("limita a frequência da detecção ao mover o mouse", async () => {
    await ready();
    act(() => handlers.onHover!({ lat: -10, lon: -55 }));
    now = 1010;
    act(() => handlers.onHover!({ lat: 0, lon: 25 }));
    expect(screen.getByTestId("globe-continent")).toHaveTextContent("América do Sul");
  });
});
