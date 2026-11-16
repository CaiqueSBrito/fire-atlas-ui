import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchHomeSummary } from "@/lib/api/home";
import { LiveStats } from "./live-stats";

vi.mock("@/lib/api/client", () => ({ hasApi: true }));
vi.mock("@/lib/api/home", () => ({ fetchHomeSummary: vi.fn() }));

const mocked = vi.mocked(fetchHomeSummary);

beforeEach(() => {
  mocked.mockReset();
});

describe("LiveStats", () => {

  it("does not display invented numbers when no data is available", async () => {
    mocked.mockResolvedValue(null);
    const { container } = render(<LiveStats />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("hides the statistics without breaking the home page when the API fails", async () => {
    mocked.mockRejectedValue(new Error("unavailable"));
    const { container } = render(<LiveStats />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("cancels the request when leaving the home page", () => {
    mocked.mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<LiveStats />);
    const signal = mocked.mock.calls[0][0]!;
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });
});
