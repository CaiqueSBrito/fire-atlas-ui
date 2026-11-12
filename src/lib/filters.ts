import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";
import { DEFAULT_REGION_ID, getRegion } from "@/config/regions";
import { SENSORS } from "@/lib/sensors";
import { formatBboxParam, parseBbox, validateBbox } from "@/lib/utils/bbox";
import { isValidDate, shiftDate, todayUtc } from "@/lib/utils/dates";
import type { Bbox, SensorId } from "@/types/detections";

export const DEFAULT_PERIOD_DAYS = 7;

export const filterParsers = {
  sensors: parseAsArrayOf(parseAsStringLiteral(SENSORS)).withDefault([
    ...SENSORS,
  ]),
  from: parseAsString,
  to: parseAsString,
  region: parseAsString,
  bbox: parseAsString,
  date: parseAsString,
};

export interface RawFilters {
  sensors: SensorId[];
  from: string | null;
  to: string | null;
  region: string | null;
  bbox: string | null;
  date: string | null;
}

export interface ResolvedFilters {
  sensors: SensorId[];
  from: string;
  to: string;
  regionId: string;
  bbox: Bbox;
  customArea: boolean;
  problem: string | null;
}

export function resolveFilters(
  raw: RawFilters,
  today: string = todayUtc(),
): ResolvedFilters {
  const custom = parseBbox(raw.bbox);
  const bboxProblem = raw.bbox
    ? custom
      ? validateBbox(custom)
      : "Área inválida na URL."
    : null;
  const region = getRegion(raw.region);

  const from0 = isValidDate(raw.from) ? raw.from : null;
  const to0 = isValidDate(raw.to) ? raw.to : null;
  const day = isValidDate(raw.date) ? raw.date : null;

  let from: string;
  let to: string;
  if (from0 || to0) {
    to = to0 ?? today;
    from = from0 ?? shiftDate(to, -(DEFAULT_PERIOD_DAYS - 1));
  } else if (day) {
    from = to = day;
  } else {
    to = today;
    from = shiftDate(today, -(DEFAULT_PERIOD_DAYS - 1));
  }

  const rangeProblem = from > to ? "A data inicial é posterior à final." : null;

  return {
    sensors: raw.sensors,
    from,
    to,
    regionId: region.id,
    bbox: custom && !bboxProblem ? custom : region.bbox,
    customArea: Boolean(custom && !bboxProblem),
    problem: bboxProblem ?? rangeProblem,
  };
}

export function isDirty(raw: RawFilters): boolean {
  return (
    raw.sensors.length !== SENSORS.length ||
    raw.from !== null ||
    raw.to !== null ||
    (raw.region !== null && raw.region !== DEFAULT_REGION_ID) ||
    raw.bbox !== null
  );
}

export { formatBboxParam };
