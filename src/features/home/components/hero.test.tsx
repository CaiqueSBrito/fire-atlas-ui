import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Hero } from "./hero";

vi.mock("./hero-globe", () => ({ HeroGlobe: () => <div data-testid="hero-globe" /> }));

describe("Hero", () => {
  it("tem um único título principal", () => {
    render(<Hero />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "MODIS e VIIRS, um só calendário de queimadas.",
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
});
