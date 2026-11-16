export interface NavItem {
  href: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/explore/map", label: "Map" },
  { href: "/explore/calendar", label: "Calendar" },
  { href: "/explore/statistics", label: "Analytics" },
  { href: "/explore/forecasts", label: "Forecasts" },
];
