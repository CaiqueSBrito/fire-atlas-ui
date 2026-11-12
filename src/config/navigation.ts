import { FEATURES } from "./features";

export interface NavItem {
  href: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/explore/map", label: "Mapa" },
  { href: "/explore/calendar", label: "Calendário" },
  { href: "/explore/statistics", label: "Análises" },
  ...(FEATURES.forecast
    ? [{ href: "/explore/forecasts", label: "Previsões" }]
    : []),
];
