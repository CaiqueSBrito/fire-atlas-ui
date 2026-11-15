import { parseAsString } from "nuqs";

export const calendarParsers = {
  month: parseAsString,
  date: parseAsString,
  region: parseAsString,
  bbox: parseAsString,
};
