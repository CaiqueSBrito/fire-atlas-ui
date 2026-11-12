import { FEATURES } from "./features";

export interface NavItem {
  href: string;
  label: string;
}

// O calendário é a rota /explore/calendar (sidebar retrátil própria).
// A previsão só aparece com a feature flag ligada (funcionalidade validada).
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/explore/map", label: "Mapa" },
  { href: "/explore/calendar", label: "Calendário" },
  { href: "/explore/statistics", label: "Análises" },
  ...(FEATURES.forecast
    ? [{ href: "/explore/forecasts", label: "Previsões" }]
    : []),
];
