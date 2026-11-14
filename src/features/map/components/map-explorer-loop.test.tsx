import { screen } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { fetchDetections } from "@/lib/api/detections";
import { renderWithProviders } from "@/test/render";
import { MapExplorer } from "./map-explorer";

vi.mock("@/lib/api/detections", () => ({
  fetchDetections: vi.fn(),
  fetchStats: vi.fn(),
}));

const renders = { count: 0 };

vi.mock("./fire-map-loader", () => ({
  FireMap: (p: {
    detections: unknown[];
    cellsKey?: string;
    onHexChange: (info: unknown) => void;
  }) => {
    renders.count++;
    useEffect(() => {
      p.onHexChange({ res: 3, edgeKm: 69, max: 1, cells: 0, top: [] });
    });
    return <div data-testid="fire-map" data-count={p.detections.length} />;
  },
}));

const mocked = vi.mocked(fetchDetections);

beforeEach(() => {
  mocked.mockReset();
  renders.count = 0;
});

describe("MapExplorer não entra em laço infinito de atualização", () => {
  it("com plot=hex na URL e a consulta ainda carregando", async () => {
    mocked.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex" });
    expect(await screen.findByTestId("fire-map")).toBeInTheDocument();
    expect(renders.count).toBeLessThan(15);
  });

  it("com plot=hex na URL e a API fora do ar", async () => {
    mocked.mockRejectedValue(new ApiError("Não foi possível conectar ao servidor."));
    renderWithProviders(<MapExplorer />, { searchParams: "?plot=hex" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível conectar");
    expect(renders.count).toBeLessThan(15);
  });
});
