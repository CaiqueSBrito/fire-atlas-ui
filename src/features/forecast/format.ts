import type { ForecastCell } from "@/types/forecast";

export const fmtDate = (d: string) => `${d.slice(5, 7)}/${d.slice(8, 10)}/${d.slice(0, 4)}`;
export const fmtInt = (n: number) => n.toLocaleString("en-US");
export const fmtNum = (n: number | null, digits = 1) =>
  n === null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: digits });
export const fmtPct = (p: number | null) =>
  p === null
    ? null
    : (p * 100).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const COORD = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

export function fmtCoords(cell: Pick<ForecastCell, "lat" | "lon">) {
  return `${Math.abs(cell.lat).toLocaleString("en-US", COORD)}° ${cell.lat < 0 ? "S" : "N"}, ${Math.abs(
    cell.lon,
  ).toLocaleString("en-US", COORD)}° ${cell.lon < 0 ? "W" : "E"}`;
}

export function place(cell: ForecastCell) {
  if (!cell.city && !cell.country) return "No location recorded";
  const city = cell.city
    ? `${cell.city}${cell.cityDistanceKm !== null ? ` (${fmtNum(cell.cityDistanceKm, 0)} km)` : ""}`
    : null;
  return [city, cell.country].filter(Boolean).join(", ");
}
