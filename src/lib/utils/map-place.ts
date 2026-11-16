import { cellToBoundary } from "h3-js";
import type { Bbox } from "@/types/detections";
import { formatBboxParam, parseBbox, validateBbox } from "./bbox";

const KEY = "fire-atlas:map-place";
const EVENT = "fire-atlas:map-place";

export type MapPlace = { region: string; bbox: Bbox };

export function hexBbox(id: string, padDeg = 0.05): Bbox {
  const ring = cellToBoundary(id, true);
  const lons = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  return [
    Math.max(-180, Math.min(...lons) - padDeg),
    Math.max(-85, Math.min(...lats) - padDeg),
    Math.min(180, Math.max(...lons) + padDeg),
    Math.min(85, Math.max(...lats) + padDeg),
  ];
}

export function saveMapPlace(place: MapPlace) {
  try {
    const value = `${place.region}|${formatBboxParam(place.bbox)}`;
    if (sessionStorage.getItem(KEY) === value) return;
    sessionStorage.setItem(KEY, value);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    return;
  }
}

export function readMapPlaceRaw(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function parseMapPlace(raw: string | null): MapPlace | null {
  if (!raw) return null;
  const [region, bboxText] = raw.split("|");
  const bbox = parseBbox(bboxText);
  if (!region || !bbox || validateBbox(bbox)) return null;
  return { region, bbox };
}

export function subscribeMapPlace(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
