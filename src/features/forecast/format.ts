import type { ForecastCell } from "@/types/forecast";

export const fmtDate = (d: string) => d.split("-").reverse().join("/");
export const fmtInt = (n: number) => n.toLocaleString("pt-BR");
export const fmtNum = (n: number | null, digits = 1) =>
  n === null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
export const fmtPct = (p: number | null) =>
  p === null
    ? null
    : (p * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const COORD = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

export function fmtCoords(cell: Pick<ForecastCell, "lat" | "lon">) {
  return `${Math.abs(cell.lat).toLocaleString("pt-BR", COORD)}° ${cell.lat < 0 ? "S" : "N"}, ${Math.abs(
    cell.lon,
  ).toLocaleString("pt-BR", COORD)}° ${cell.lon < 0 ? "O" : "L"}`;
}

export function place(cell: ForecastCell) {
  if (!cell.city && !cell.country) return "Sem localidade registrada";
  const city = cell.city
    ? `${cell.city}${cell.cityDistanceKm !== null ? ` (${fmtNum(cell.cityDistanceKm, 0)} km)` : ""}`
    : null;
  return [city, cell.country].filter(Boolean).join(", ");
}
