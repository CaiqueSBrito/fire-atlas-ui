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

export type ApiSensorDay = { count: number; frpSum: number };

export type ApiCalendarDay = {
  date: string;
  modis: ApiSensorDay;
  viirs: ApiSensorDay;
};

export type ApiCalendarResponse = {
  month: string;
  resolution?: number;
  daysWithFire: number;
  days: ApiCalendarDay[];
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
    detectionsPerDay: number;
  };
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

export type ApiSource = {
  product: string;
  sensor: string;
  sourceKey: string;
  bbox?: string | null;
  periodStart: string;
  periodEnd: string;
  status: string;
  rowsLoaded: number;
  verified?: boolean;
  minDate?: string | null;
  maxDate?: string | null;
};

export type ApiPredictionResponse = {
  available: boolean;
  status: string;
  reason?: string | null;
};
