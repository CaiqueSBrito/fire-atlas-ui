import { StrictMode, useEffect } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAnnualBootstrap, startAnnualBootstrap, type AnnualLoadingState } from "@/lib/api/bootstrap";
import { AnnualDataGate, AnnualDataProvider } from "./annual-data-gate";

vi.mock("@/lib/api/client", () => ({ hasApi: true }));
vi.mock("@/lib/api/bootstrap", () => ({
  startAnnualBootstrap: vi.fn(),
  getAnnualBootstrap: vi.fn(),
}));

const loading: AnnualLoadingState = {
  state: "loading", completedUnits: 2, totalUnits: 4, rowsLoaded: 120,
  message: "Recuperando dados de 2026.", error: null,
};
const ready: AnnualLoadingState = { ...loading, state: "ready", completedUnits: 4 };
const start = vi.mocked(startAnnualBootstrap);
const poll = vi.mocked(getAnnualBootstrap);

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
});
afterEach(() => vi.useRealTimers());

async function flush() {
  await act(async () => { await Promise.resolve(); });
}

describe("entrada após a carga anual", () => {
  it("não monta consumidores antes de ready, mesmo com todas as etapas contadas", async () => {
    const mounted = vi.fn();
    function Consumer() {
      useEffect(() => { mounted(); }, []);
      return <p>Exploração disponível</p>;
    }
    start.mockResolvedValue({ ...loading, completedUnits: 4 });
    poll.mockResolvedValue(ready);
    render(<AnnualDataProvider><AnnualDataGate><Consumer /></AnnualDataGate></AnnualDataProvider>);
    await flush();
    expect(mounted).not.toHaveBeenCalled();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "99");
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(screen.getByText("Exploração disponível")).toBeVisible();
    expect(mounted).toHaveBeenCalledOnce();
  });

  it("mantém a entrada bloqueada após falha e só libera depois da retomada concluída", async () => {
    start.mockResolvedValueOnce(loading).mockResolvedValueOnce(ready);
    poll.mockRejectedValue(new Error("Conexão interrompida"));
    render(<AnnualDataProvider><AnnualDataGate><p>Exploração disponível</p></AnnualDataGate></AnnualDataProvider>);
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(screen.queryByText("Exploração disponível")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Conexão interrompida");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    fireEvent.click(screen.getByRole("button", { name: "Retomar carregamento" }));
    await flush();
    expect(screen.getByText("Exploração disponível")).toBeVisible();
  });

  it("remonta em StrictMode sem uma resposta abortada sobrescrever a carga ativa", async () => {
    start.mockImplementation((signal) => {
      const { promise, resolve, reject } = Promise.withResolvers<AnnualLoadingState>();
      signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      queueMicrotask(() => resolve(ready));
      return promise;
    });
    render(<StrictMode><AnnualDataProvider><AnnualDataGate><p>Exploração disponível</p></AnnualDataGate></AnnualDataProvider></StrictMode>);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByText("Exploração disponível")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
