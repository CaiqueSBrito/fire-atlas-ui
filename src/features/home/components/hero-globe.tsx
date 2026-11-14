"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { REGIONS } from "@/config/regions";
import { continentAt, type ContinentId } from "@/lib/utils/continent";
import { loadCountries, type CountryCollection } from "@/lib/utils/countries";
import { markIntroFly } from "@/lib/utils/intro-fly";
import { GlobeLoader } from "./globe-loader";

const HOVER_INTERVAL_MS = 80;

export function HeroGlobe() {
  const router = useRouter();
  const countries = useRef<CountryCollection | null>(null);
  const lastHover = useRef(0);
  const [hovered, setHovered] = useState<ContinentId | null>(null);

  useEffect(() => {
    void loadCountries().then((loaded) => {
      countries.current = loaded;
    });
  }, []);

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

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

  const onPick = (lat: number, lon: number) => {
    const id = continentAt(lon, lat, countries.current);
    if (!id) return;
    markIntroFly();
    router.push(`/explore/map?region=${id}`);
  };

  const label = hovered ? REGIONS.find((r) => r.id === hovered)?.label : null;

  return (
    <>
      <div aria-hidden className="absolute inset-0 -z-20">
        <GlobeLoader onPick={onPick} onHover={onHover} />
      </div>
      {label && (
        <p
          aria-hidden
          className="pointer-events-none absolute bottom-6 right-6 z-10 rounded-full border border-space-600 bg-space-900/85 px-4 py-2 text-small"
        >
          Clique para explorar: <strong>{label}</strong>
        </p>
      )}
    </>
  );
}
