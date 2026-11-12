export const NAV_ITEMS = [
  { href: "/explore/map", label: "Mapa" },
  { href: "/explore/calendar", label: "Calendário" },
  { href: "/explore/statistics", label: "Estatísticas" },
  { href: "/explore/forecasts", label: "Previsões" },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];
