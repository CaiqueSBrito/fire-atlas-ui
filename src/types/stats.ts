import type { DataOrigin, SensorId } from "./detections";

export type SeriesPoint = {
  date: string;
  modis?: number | null;
  viirs?: number | null;
  harmonized?: number | null;
};

export type StatsResponse = {
  bySensor: Partial<Record<SensorId, number | null>>;
  harmonized?: { total: number | null } | null;
  frp?: { total?: number | null; mean?: number | null; unit: string } | null;
  series: SeriesPoint[];
  ranking?: {
    criterion: string;
    rule: string;
    unit: string;
    items: { label: string; value: number; h3?: string }[];
  } | null;
  criticalPeriods?: {
    criterion: string;
    items: { label: string; from: string; to: string; value: number }[];
  } | null;
  history?: {
    metric: string;
    unit: string;
    observed: number;
    reference: number;
    referencePeriod: string;
    method: string;
    anomaly: number;
    anomalyDefinition: string;
  } | null;
  source: DataOrigin;
};

export type HarmonizedMonth = {
  month: string;
  value: number | null;
  daysWithData: number;
  daysInMonth: number;
  complete: boolean;
};

export type HarmonizedMonthly = {
  months: HarmonizedMonth[];
  unitLabel: string;
  warnings: string[];
};

export type CellHistory = {
  cell: string;
  start: string;
  end: string;
  days: number;
  current: { year: number; detections: number };
  years: { year: number; detections: number }[];
  currentPerDay: number;
  meanPerDay: number | null;
  changePct: number | null;
  anomalousSensors: string[];
  sufficient: boolean;
  yearsWithData: number;
  minYears: number;
  yearsRequested: number;
  notes: string[];
};
