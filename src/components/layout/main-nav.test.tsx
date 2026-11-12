import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/explore/map", search: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { NAV_ITEMS } from "@/config/navigation";
import { MainNav } from "./main-nav";

afterEach(() => {
  nav.pathname = "/explore/map";
  nav.search = "";
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("MainNav (RN03)", () => {
  it("lista as seções disponíveis", () => {
    render(<MainNav />);
    const links = screen.getAllByRole("link").map((a) => a.textContent);
    expect(links).toEqual(["Início", "Mapa", "Calendário", "Análises"]);
  });

  it("marca a seção atual com aria-current", () => {
    nav.pathname = "/explore/statistics";
    render(<MainNav />);
    expect(screen.getByRole("link", { name: "Análises" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Mapa" })).not.toHaveAttribute("aria-current");
  });

  it("Início só fica ativo na raiz", () => {
    nav.pathname = "/";
    render(<MainNav />);
    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute("aria-current", "page");
  });

  it("Início não fica ativo dentro do explore", () => {
    render(<MainNav />);
    expect(screen.getByRole("link", { name: "Início" })).not.toHaveAttribute("aria-current");
  });

  it("preserva a query string ao navegar entre seções", () => {
    nav.search = "sensors=viirs&region=brasil&from=2026-03-01";
    render(<MainNav />);
    expect(screen.getByRole("link", { name: "Análises" })).toHaveAttribute(
      "href",
      "/explore/statistics?sensors=viirs&region=brasil&from=2026-03-01",
    );
    expect(screen.getByRole("link", { name: "Calendário" })).toHaveAttribute(
      "href",
      "/explore/calendar?sensors=viirs&region=brasil&from=2026-03-01",
    );
  });

  it("sem filtros usa links limpos", () => {
    render(<MainNav />);
    expect(screen.getByRole("link", { name: "Mapa" })).toHaveAttribute("href", "/explore/map");
  });

  it("é uma navegação rotulada", () => {
    render(<MainNav />);
    expect(screen.getByRole("navigation", { name: "Seções principais" })).toBeInTheDocument();
  });
});

describe("NAV_ITEMS (previsão condicionada)", () => {
  it("não inclui previsões por padrão", () => {
    expect(NAV_ITEMS.map((i) => i.href)).not.toContain("/explore/forecasts");
  });

  it("inclui previsões quando a feature está ligada", async () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_FORECAST", "true");
    vi.resetModules();
    const mod = await import("@/config/navigation");
    expect(mod.NAV_ITEMS.map((i) => i.href)).toContain("/explore/forecasts");
  });
});
