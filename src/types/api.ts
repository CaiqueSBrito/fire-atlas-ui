export type ApiSensor = "MODIS" | "VIIRS";

export type ApiCell = {
  sensor: ApiSensor;
  h3: string;
  resolution: number;
  count: number;
  frpSum: number;
  frpMax?: number | null;
};

export type ApiDetectionsResponse = {
  mode: "grid";
  count: number;
  truncated: boolean;
  resolution: number;
  cells?: ApiCell[] | null;
  message?: string | null;
};

export type ApiActivityMeta = {
  region: string;
  start: string;
  end: string;
  resolution: number;
  unitLabelPt: string;
  unitLabelEn: string;
  source: string;
  method: string;
  areaKm2Estimate?: number | null;
  smallArea: boolean;
  warnings: string[];
};

export type ApiTemperatureBin = {
  key: string;
  fromK?: number | null;
  toK?: number | null;
  harmonized: number;
};

export type ApiActivityDay = {
  date: string;
  harmonized: number | null;
  contributing: number;
  hasData: boolean;
  basis?: string | null;
  temperature?: ApiTemperatureBin[] | null;
};

export type ApiActivityCalendarResponse = {
  month: string;
  daysWithData: number;
  days: ApiActivityDay[];
  meta?: ApiActivityMeta | null;
  message?: string | null;
};

export type ApiActivityAnomalyResponse = {
  month: string;
  current: number | null;
  currentDaysWithData: number;
  currentMonthComplete: boolean;
  baseline: { year: number; harmonized: number; daysWithData: number }[];
  yearsWithData: number;
  minYears: number;
  baselineMedian: number | null;
  ratioToMedian: number | null;
  deviationPct: number | null;
  sufficient: boolean;
  note: string | null;
  meta?: ApiActivityMeta | null;
};

export type ApiSatelliteDay = {
  date: string;
  platform: string;
  units: number;
  typicalUnits: number;
  available: boolean;
  contributes: boolean;
};

export type ApiActivityAvailabilityResponse = {
  start: string;
  end: string;
  count: number;
  days: ApiSatelliteDay[];
  source?: string | null;
  message?: string | null;
};

export type ApiSensorStats = {
  sensor: ApiSensor;
  detections: number;
  daysWithData: number;
  frpMean?: number | null;
  frpMax?: number | null;
  frpTotal: number;
  confidence?: Record<string, number> | null;
  confidenceMean?: number | null;
  nominalResolutionMeters: number;
};

export type ApiCompareResponse = {
  region?: string;
  start: string;
  end: string;
  sensors: ApiSensorStats[];
  notice?: string | null;
  message?: string | null;
};

export type ApiTimeseriesPoint = {
  date: string;
  sensor: ApiSensor;
  count: number;
  frpSum: number;
  robustZ?: number | null;
  unusual: boolean;
};

export type ApiTimeseriesResponse = {
  method: string;
  threshold: number;
  resolution?: number;
  series: ApiTimeseriesPoint[];
  message?: string | null;
};

export type ApiRankingItem = {
  rank: number;
  h3: string;
  resolution: number;
  detections: number;
  frpSum: number;
  frpMax?: number | null;
  modisDetections: number;
  viirsDetections: number;
  critical: boolean;
};

export type ApiRankingResponse = {
  metric: string;
  resolution: number;
  totalCells: number;
  criticalPercentile: number;
  criticalThreshold?: number | null;
  items: ApiRankingItem[];
  message?: string | null;
};

export type ApiHistoricalSensor = {
  sensor: ApiSensor;
  current: {
    start: string;
    end: string;
    days: number;
    daysWithData: number;
    detections: number;
    detectionsPerDay: number | null;
  };
  baseline?: {
    year: number;
    start: string;
    end: string;
    detections: number;
    detectionsPerDay: number;
  }[];
  yearsWithData: number;
  meanDetectionsPerDay?: number | null;
  stdDevDetectionsPerDay?: number | null;
  changeVsMeanPct?: number | null;
  zScore?: number | null;
  anomalous?: boolean | null;
  sufficient: boolean;
  note?: string | null;
};

export type ApiHistoricalResponse = {
  resolution?: number;
  yearsRequested: number;
  minYears: number;
  zThreshold: number;
  sensors: ApiHistoricalSensor[];
};

/** GET /meta/coverage: periodo coberto por sensor, lido direto do data lake. */
export type ApiCoverage = {
  sensor: string;
  minDate: string | null;
  maxDate: string | null;
  detections: number;
};

export type ApiForecastItem = {
  h3: string;
  region?: string | null;
  probability7d: number;
  detections24h?: number | null;
  detections3d?: number | null;
  detections7d?: number | null;
  frpMean7d?: number | null;
  active?: boolean | null;
  countryName?: string | null;
  cityName?: string | null;
  cityDistanceKm?: number | null;
};

export type ApiForecastSummary = {
  cells: number;
  activeCells: number;
  maxProbability?: number | null;
  meanProbability?: number | null;
};

export type ApiForecastResponse = {
  issueDate?: string | null;
  latestIssueDate?: string | null;
  region: string;
  summary?: ApiForecastSummary | null;
  count: number;
  truncated: boolean;
  items: ApiForecastItem[];
  source: string;
  method: string;
  message?: string | null;
};

export type ApiActivityMonthItem = {
  month: string;
  harmonized?: number | null;
  daysWithData: number;
  daysInMonth: number;
  complete: boolean;
};

export type ApiActivityMonthlyResponse = {
  months: ApiActivityMonthItem[];
  meta?: ApiActivityMeta | null;
  message?: string | null;
};
