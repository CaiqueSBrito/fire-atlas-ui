import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CountryCollection, Ring } from "@/lib/utils/countries";
import { HeroGlobe } from "./hero-globe";

vi.mock("@/lib/api/home", () => ({
  fetchTopHotspots: () => Promise.resolve(null),
  HOTSPOT_DAYS: 7,
}));

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
  it("hides the label when leaving the globe or hovering over the ocean", async () => {
    await ready();
    act(() => handlers.onHover!({ lat: -10, lon: -55 }));
    now = 2000;
    act(() => handlers.onHover!({ lat: 0, lon: -30 }));
    expect(screen.queryByTestId("globe-continent")).not.toBeInTheDocument();
    now = 3000;
    act(() => handlers.onHover!({ lat: 0, lon: 25 }));
    expect(screen.getByTestId("globe-continent")).toHaveTextContent("Africa");
    act(() => handlers.onHover!(null));
    expect(screen.queryByTestId("globe-continent")).not.toBeInTheDocument();
  });

  it("throttles detection while moving the mouse", async () => {
    await ready();
    act(() => handlers.onHover!({ lat: -10, lon: -55 }));
    now = 1010;
    act(() => handlers.onHover!({ lat: 0, lon: 25 }));
    expect(screen.getByTestId("globe-continent")).toHaveTextContent("South America");
  });
});
