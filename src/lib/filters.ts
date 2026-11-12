import { parseAsString, parseAsStringLiteral } from "nuqs";

export const SATELLITES = ["all", "modis", "viirs", "harmonized"] as const;
export type Satellite = (typeof SATELLITES)[number];

export const SATELLITE_OPTIONS: ReadonlyArray<{
  value: Satellite;
  label: string;
}> = [
  { value: "all", label: "Todos" },
  { value: "modis", label: "MODIS" },
  { value: "viirs", label: "VIIRS" },
  { value: "harmonized", label: "Harmonizado" },
];

/** Filtros da análise: vivem na query string (RN03). Datas em AAAA-MM-DD. */
export const filterParsers = {
  satellite: parseAsStringLiteral(SATELLITES).withDefault("all"),
  from: parseAsString,
  to: parseAsString,
};

export interface Filters {
  satellite: Satellite;
  from: string | null;
  to: string | null;
}
