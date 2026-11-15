export type ForecastCell = {
  id: string;
  lat: number;
  lon: number;
  probability: number;
  detections24h: number | null;
  detections7d: number | null;
  frpMean7d: number | null;
  active: boolean | null;
  country: string | null;
  city: string | null;
  cityDistanceKm: number | null;
};

export type ForecastSummary = {
  cells: number;
  activeCells: number;
  maxProbability: number | null;
  meanProbability: number | null;
};

export type ForecastResponse =
  | {
      status: "available";
      issueDate: string;
      summary: ForecastSummary;
      cells: ForecastCell[];
      truncated: boolean;
      source: string;
      method: string;
    }
  | { status: "unavailable"; reason: string };
