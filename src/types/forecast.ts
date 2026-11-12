import type { Bbox } from "./detections";

export type ForecastArea = {
  id: string;
  label: string;
  bbox: Bbox;
  frpPredicted?: { value: number; unit: string } | null;
  confidence?: { metric: string; value: number } | null;
};

export type ForecastResponse =
  | {
      status: "available";
      model: { name: string; version?: string };
      region: string;
      horizon: { from: string; to: string };
      areas: ForecastArea[];
      limitations: string[];
      generatedAt?: string;
    }
  | { status: "unavailable"; reason: string };
