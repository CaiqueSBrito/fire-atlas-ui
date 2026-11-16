import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/explore/map", search: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { MainNav } from "./main-nav";

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    disconnect() {}
  });
});

afterEach(() => {
  nav.pathname = "/explore/map";
  nav.search = "";
  vi.unstubAllGlobals();
});

describe("MainNav (RN03)", () => {

  it("marca a seção atual com aria-current", () => {
    nav.pathname = "/explore/statistics";
    render(<MainNav />);
    expect(screen.getByRole("link", { name: "Analytics" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Map" })).not.toHaveAttribute("aria-current");
  });

  it("Início só fica ativo na raiz", () => {
    nav.pathname = "/";
    render(<MainNav />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  });

  it("Início não fica ativo dentro do explore", () => {
    render(<MainNav />);
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("preserva a query string ao navegar entre seções", () => {
    nav.search = "sensors=viirs&region=brasil&from=2026-03-01";
    render(<MainNav />);
    expect(screen.getByRole("link", { name: "Analytics" })).toHaveAttribute(
      "href",
      "/explore/statistics?sensors=viirs&region=brasil&from=2026-03-01",
    );
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "href",
      "/explore/calendar?sensors=viirs&region=brasil&from=2026-03-01",
    );
  });

  it("sem filtros usa links limpos", () => {
    render(<MainNav />);
    expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute("href", "/explore/map");
  });

});
