"use client";

import { useEffect, useState } from "react";
import { nextQueryArea } from "@/lib/utils/viewport-area";
import type { Bbox } from "@/types/detections";

const DEBOUNCE_MS = 350;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), value === null ? 0 : ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export function useQueryArea(
  viewport: Bbox | null,
  fallback: Bbox,
  enabled: boolean,
): Bbox {
  const settled = useDebounced(viewport, DEBOUNCE_MS);
  const [seen, setSeen] = useState<Bbox | null>(null);
  const [area, setArea] = useState<Bbox | null>(null);

  if (settled !== seen) {
    setSeen(settled);
    setArea(settled ? nextQueryArea(area, settled) : null);
  }

  return enabled && viewport && settled && area ? area : fallback;
}
