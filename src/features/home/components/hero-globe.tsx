"use client";

import { useEffect, useRef, useState } from "react";
import { REGIONS } from "@/config/regions";
import { fetchTopHotspots, HOTSPOT_DAYS } from "@/lib/api/home";
import { continentAt, type ContinentId } from "@/lib/utils/continent";
import { loadCountries, type CountryCollection } from "@/lib/utils/countries";
import { GlobeLoader } from "./globe-loader";

const HOVER_INTERVAL_MS = 80;

export function HeroGlobe() {
  const countries = useRef<CountryCollection | null>(null);
  const lastHover = useRef(0);
  const [hovered, setHovered] = useState<ContinentId | null>(null);
  const [hotspots, setHotspots] = useState<Array<[number, number]> | null>(null);

  useEffect(() => {
    void loadCountries().then((loaded) => {
      countries.current = loaded;
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchTopHotspots(controller.signal)
      .then((points) => {
        if (!controller.signal.aborted) setHotspots(points);
      })
      .catch(() => {
        if (!controller.signal.aborted) setHotspots(null);
      });
    return () => controller.abort();
  }, []);

  const onHover = (point: { lat: number; lon: number } | null) => {
    if (!point) {
      setHovered(null);
      return;
    }
    const now = performance.now();
    if (now - lastHover.current < HOVER_INTERVAL_MS) return;
    lastHover.current = now;
    setHovered(continentAt(point.lon, point.lat, countries.current));
  };

  const label = hovered ? REGIONS.find((r) => r.id === hovered)?.label : null;

  return (
    <>
      <div aria-hidden className="absolute inset-0 -z-20">
        <GlobeLoader onHover={onHover} hotspots={hotspots} />
      </div>
      <div className="pointer-events-none absolute bottom-6 right-6 z-10 hidden max-w-xs flex-col items-end gap-2 text-right lg:flex">
        {label && (
          <p
            aria-hidden
            data-testid="globe-continent"
            className="rounded-full border border-space-600 bg-space-900/85 px-4 py-2 text-small font-semibold tracking-[-0.02em]"
          >
            {label}
          </p>
        )}
        <p className="text-caption text-ink-300">
          {hotspots
            ? `Globe points: cells with the most detections in the latest imported period (up to ${HOTSPOT_DAYS} days).`
            : "Globe points are illustrative."}
        </p>
      </div>
    </>
  );
}
