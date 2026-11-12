/** Origem do dado — sempre preservada e exibida (originais vs. harmonizado). */
export type DataSource = "modis" | "viirs" | "harmonized";

export interface FireSummary {
  total: number;
  bySatellite: Partial<Record<DataSource, number>>;
}
