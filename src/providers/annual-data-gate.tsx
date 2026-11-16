"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AnnualLoadingScreen } from "@/components/loading/annual-loading-screen";
import {
  getAnnualBootstrap,
  startAnnualBootstrap,
  type AnnualLoadingState,
} from "@/lib/api/bootstrap";
import { hasApi } from "@/lib/api/client";

const POLL_INTERVAL_MS = 1_500;

const INITIAL_STATUS: AnnualLoadingState = {
  state: hasApi ? "idle" : "failed",
  completedUnits: 0,
  totalUnits: 0,
  rowsLoaded: 0,
  phase: "preparing",
  finalizationCompleted: 0,
  finalizationTotal: 0,
  message: hasApi
    ? "Connecting to the shared 2026 data load."
    : "The 2026 data load is unavailable.",
  error: hasApi
    ? null
    : "The API is not configured. Set NEXT_PUBLIC_API_URL to load real 2026 data.",
};

const AnnualDataContext = createContext<{
  status: AnnualLoadingState;
  onRetry: () => void;
} | null>(null);

export function AnnualDataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AnnualLoadingState>(INITIAL_STATUS);
  const retryRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!hasApi) return;

    const controller = new AbortController();
    let active = true;
    let running = false;
    let canRetry = false;
    let timer: number | undefined;

    async function request(start: boolean) {
      if (!active || running) return;
      running = true;

      try {
        const next = await (start ? startAnnualBootstrap : getAnnualBootstrap)(controller.signal);
        if (!active) return;

        setStatus(next);
        canRetry = next.state === "failed";
        // Poll only after the previous response, never with an overlapping interval.
        if (next.state === "idle" || next.state === "loading") {
          timer = window.setTimeout(() => void request(false), POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (!active || controller.signal.aborted) return;

        canRetry = true;
        setStatus((previous) => ({
          ...previous,
          state: "failed",
          message: "Unable to monitor the shared 2026 data load.",
          error: error instanceof Error ? error.message : "Unknown error while querying the API.",
        }));
      } finally {
        running = false;
      }
    }

    retryRef.current = () => {
      if (!active || running || !canRetry) return;
      canRetry = false;
      setStatus((previous) => ({
        ...previous,
        state: "loading",
        message: "Resuming the shared 2026 data load.",
        error: null,
      }));
      void request(true);
    };

    // Each effect lifetime owns its request. Strict Mode cleanup must not leave
    // a persistent "started" flag pointing at an aborted initial request.
    void request(true);

    return () => {
      active = false;
      retryRef.current = null;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return (
    <AnnualDataContext.Provider value={{ status, onRetry: () => retryRef.current?.() }}>
      {children}
    </AnnualDataContext.Provider>
  );
}

/** O segmento Next sempre renderiza; somente os consumidores dentro da pagina aguardam a carga. */
export function AnnualDataGate({ children, showLoading = true }: { children: ReactNode; showLoading?: boolean }) {
  const context = useContext(AnnualDataContext);
  if (!context) throw new Error("AnnualDataGate requires AnnualDataProvider");
  if (context.status.state === "ready") return children;
  return showLoading
    ? <AnnualLoadingScreen status={context.status} onRetry={context.onRetry} />
    : null;
}
