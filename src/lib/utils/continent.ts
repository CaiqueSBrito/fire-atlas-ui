import type { CountryCollection, Ring } from "./countries";

export type ContinentId =
  | "north-america"
  | "south-america"
  | "europe"
  | "africa"
  | "asia"
  | "oceania";

const BY_NAME: Record<string, ContinentId> = {
  "North America": "north-america",
  "South America": "south-america",
  Europe: "europe",
  Africa: "africa",
  Asia: "asia",
  Oceania: "oceania",
};

function inRing(ring: Ring, lon: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function inPolygon(polygon: Ring[], lon: number, lat: number): boolean {
  if (!polygon.length || !inRing(polygon[0], lon, lat)) return false;
  for (let h = 1; h < polygon.length; h++) {
    if (inRing(polygon[h], lon, lat)) return false;
  }
  return true;
}

export function normalizeLon(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

export function continentAt(
  lon: number,
  lat: number,
  countries: CountryCollection | null,
): ContinentId | null {
  if (!countries) return null;
  const x = normalizeLon(lon);
  for (const feature of countries.features) {
    const { type, coordinates } = feature.geometry;
    const polygons = (type === "Polygon" ? [coordinates] : coordinates) as Ring[][];
    for (const polygon of polygons) {
      if (inPolygon(polygon, x, lat)) {
        return BY_NAME[feature.properties.continent ?? ""] ?? null;
      }
    }
  }
  return null;
}
