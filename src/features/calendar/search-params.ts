import { parseAsString, parseAsStringLiteral } from "nuqs";

// Estado do calendário na URL (RN03): sobrevive à navegação e é compartilhável.
export const calendarParsers = {
  month: parseAsString,
  date: parseAsString,
  region: parseAsString,
  time: parseAsStringLiteral(["all", "day", "night"] as const).withDefault("all"),
  view: parseAsStringLiteral(["thermal", "geographic"] as const),
};
