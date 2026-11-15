import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Hero } from "./hero";

vi.mock("./hero-globe", () => ({ HeroGlobe: () => <div data-testid="hero-globe" /> }));
vi.mock("./live-stats", () => ({ LiveStats: () => <div data-testid="live-stats" /> }));

describe("Hero", () => {
  it("tem um único título principal", () => {
    render(<Hero />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Focos de calor do planeta, em um só atlas.",
    );
  });

  it("o botão vermelho leva ao ambiente principal (CA01)", () => {
    render(<Hero />);
    expect(screen.getByRole("link", { name: /Explorar focos de calor/ })).toHaveAttribute(
      "href",
      "/explore/map",
    );
  });

  it("oferece o globo e os atalhos por região", () => {
    render(<Hero />);
    expect(screen.getByTestId("hero-globe")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Explorar por região" })).toBeInTheDocument();
  });

  it("oferece as três entradas: mapa, calendário e análises", () => {
    render(<Hero />);
    expect(screen.getByRole("link", { name: "Calendário" })).toHaveAttribute("href", "/explore/calendar");
    expect(screen.getByRole("link", { name: "Análises" })).toHaveAttribute("href", "/explore/statistics");
    expect(screen.getByTestId("live-stats")).toBeInTheDocument();
  });
});
