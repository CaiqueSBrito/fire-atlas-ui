export type Sensor = "MODIS" | "VIIRS";

export type DayStatus = "activity" | "none" | "unavailable";

export type TemperatureBasis = "viirs" | "aqua" | "terra";

export type TemperatureBin = {
  key: string;
  fromK: number | null;
  toK: number | null;
  value: number;
};

export type DataSource = {
  name: string;
  simulated: boolean;
};

export type ActivityDay = {
  date: string;
  status: DayStatus;
  value: number | null;
  contributing: number;
  basis: TemperatureBasis | null;
  temperature: TemperatureBin[] | null;
};

export type ActivityMonth = {
  month: string;
  region: string;
  days: ActivityDay[];
  unitLabel: string;
  warnings: string[];
  source: DataSource;
};

export type MonthAnomaly = {
  sufficient: boolean;
  current: number | null;
  baselineMedian: number | null;
  deviationPct: number | null;
  yearsWithData: number;
  minYears: number;
  note: string | null;
};

export type DaySatellites = {
  date: string;
  contributing: string[];
  available: string[];
};

export type Detection = {
  lat: number;
  lon: number;
  sensor: Sensor;
  dayNight: "D" | "N" | null;
};
