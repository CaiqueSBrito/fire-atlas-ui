"use client";

import { useEffect, useState } from "react";
import { fetchHomeSummary, type HomeSummary } from "@/lib/api/home";
import { hasApi } from "@/lib/api/client";
import { SENSOR_META } from "@/lib/sensors";

const fmt = (n: number) => n.toLocaleString("pt-BR");
const br = (d: string) => d.split("-").reverse().join("/");

type State = { status: "loading" } | { status: "ready"; data: HomeSummary } | { status: "off" };

export function LiveStats() {
  const [state, setState] = useState<State>(hasApi ? { status: "loading" } : { status: "off" });

  useEffect(() => {
    if (!hasApi) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const data = await fetchHomeSummary(controller.signal);
        setState(data ? { status: "ready", data } : { status: "off" });
      } catch {
        if (!controller.signal.aborted) setState({ status: "off" });
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  if (state.status === "off") return null;

  if (state.status === "loading") {
    return (
      <div role="status" className="h-[88px] w-full max-w-xl animate-pulse rounded-[32px] bg-space-800/70">
        <span className="sr-only">Carregando os números mais recentes…</span>
      </div>
    );
  }

  const { data } = state;
  return (
    <section
      aria-label="Números mais recentes"
      className="w-full max-w-xl rounded-[32px] border border-space-600 bg-space-900/80 p-4 backdrop-blur"
    >
      <dl className="grid grid-cols-3 gap-3">
        <div>
          <dt className="text-small font-semibold tracking-[-0.02em] text-ink-300">Detecções</dt>
          <dd className="font-mono text-xl font-bold">{fmt(data.total)}</dd>
        </div>
        <div>
          <dt className="text-small font-semibold tracking-[-0.02em] text-ink-300">
            <span aria-hidden style={{ color: SENSOR_META.modis.hex }}>
              {SENSOR_META.modis.symbol}
            </span>{" "}
            MODIS
          </dt>
          <dd className="font-mono text-xl font-bold">{fmt(data.modis)}</dd>
        </div>
        <div>
          <dt className="text-small font-semibold tracking-[-0.02em] text-ink-300">
            <span aria-hidden style={{ color: SENSOR_META.viirs.hex }}>
              {SENSOR_META.viirs.symbol}
            </span>{" "}
            VIIRS
          </dt>
          <dd className="font-mono text-xl font-bold">{fmt(data.viirs)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-caption text-ink-300">
        Planeta inteiro, {br(data.from)} a {br(data.to)} (período mais recente importado, até 30 dias). Detecções de
        satélite, não número de incêndios; MODIS e VIIRS não são diretamente comparáveis.
      </p>
    </section>
  );
}
