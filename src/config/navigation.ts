import { FEATURES } from "./features";

export interface NavItem {
  href: string;
  label: string;
}

// O calendário é um painel retrátil do ambiente principal (não uma rota).
// A previsão só aparece com a feature flag ligada (funcionalidade validada).
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/explore/map", label: "Mapa" },
  { href: "/explore/statistics", label: "Análises" },
  ...(FEATURES.forecast
    ? [{ href: "/explore/forecasts", label: "Previsões" }]
    : []),
];
