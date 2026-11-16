"use client";

import { useEffect, useState } from "react";
import { fetchHomeSummary, type HomeSummary } from "@/lib/api/home";
import { hasApi } from "@/lib/api/client";
import { SENSOR_META } from "@/lib/sensors";

type State = { status: "loading" } | { status: "ready"; data: HomeSummary } | { status: "off" };

export function LiveStats() {
  const [state, setState] = useState<State>(hasApi ? { status: "loading" } : { status: "off" });

  useEffect(() => {
    if (!hasApi) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const data = await fetchHomeSummary(controller.signal);
        if (!controller.signal.aborted) setState(data ? { status: "ready", data } : { status: "off" });
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
        <span className="sr-only">Loading the latest numbers…</span>
      </div>
    );
  }

  const { data } = state;
  return (
    <section
      aria-label="Latest numbers"
      className="w-full max-w-xl rounded-[32px] border border-space-600 bg-space-900/80 p-4 backdrop-blur"
    >
      <dl className="grid grid-cols-3 gap-3">
        <div>
          <dt className="text-small font-semibold tracking-[-0.02em] text-ink-300">Detections</dt>
          <dd className="font-mono text-xl font-bold">{data.total.toLocaleString("en-US")}</dd>
        </div>
        <div>
          <dt className="text-small font-semibold tracking-[-0.02em] text-ink-300">
            <span aria-hidden style={{ color: SENSOR_META.modis.hex }}>
              {SENSOR_META.modis.symbol}
            </span>{" "}
            MODIS
          </dt>
          <dd className="font-mono text-xl font-bold">{data.modis.toLocaleString("en-US")}</dd>
        </div>
        <div>
          <dt className="text-small font-semibold tracking-[-0.02em] text-ink-300">
            <span aria-hidden style={{ color: SENSOR_META.viirs.hex }}>
              {SENSOR_META.viirs.symbol}
            </span>{" "}
            VIIRS
          </dt>
          <dd className="font-mono text-xl font-bold">{data.viirs.toLocaleString("en-US")}</dd>
        </div>
      </dl>
      <p className="mt-2 text-caption text-ink-300">
        Worldwide, {new Date(`${data.from}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC" })} to {new Date(`${data.to}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC" })} (latest imported period, up to 30 days). Satellite
        detections, not the number of fires; MODIS and VIIRS are not directly comparable.
      </p>
    </section>
  );
}
