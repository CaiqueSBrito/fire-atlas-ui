import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LiveStats } from "./live-stats";

vi.mock("@/lib/api/client", () => ({ hasApi: true }));
vi.mock("@/lib/api/home", () => ({
  fetchHomeSummary: () => Promise.reject(new Error("fora do ar")),
}));

describe("LiveStats com a API fora do ar", () => {
  it("some com a faixa sem quebrar a home", async () => {
    const { container } = render(<LiveStats />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
