export const NAV_ITEMS = [
  { href: "/explorar/mapa", label: "Mapa" },
  { href: "/explorar/calendario", label: "Calendário" },
  { href: "/explorar/estatisticas", label: "Estatísticas" },
  { href: "/explorar/previsoes", label: "Previsões" },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];
