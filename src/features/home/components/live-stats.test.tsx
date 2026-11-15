import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchHomeSummary } from "@/lib/api/home";
import { LiveStats } from "./live-stats";

vi.mock("@/lib/api/client", () => ({ hasApi: true }));
vi.mock("@/lib/api/home", () => ({ fetchHomeSummary: vi.fn() }));

const mocked = vi.mocked(fetchHomeSummary);

beforeEach(() => mocked.mockClear());

describe("LiveStats", () => {
  it("mostra carregamento e depois os números reais com período e ressalvas", async () => {
    mocked.mockResolvedValue({ from: "2026-10-15", to: "2026-11-13", total: 5057256, modis: 292578, viirs: 4764678 });
    render(<LiveStats />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
    expect(await screen.findByText("5.057.256")).toBeInTheDocument();
    expect(screen.getByText("292.578")).toBeInTheDocument();
    expect(screen.getByText("4.764.678")).toBeInTheDocument();
    expect(screen.getByText(/15\/10\/2026 a 13\/11\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/não número de incêndios/)).toBeInTheDocument();
  });

  it("sem dados carregados também não mostra nada", async () => {
    mocked.mockResolvedValue(null);
    const { container } = render(<LiveStats />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
