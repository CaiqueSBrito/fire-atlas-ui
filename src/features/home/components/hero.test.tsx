import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Hero } from "./hero";

vi.mock("./hero-globe", () => ({ HeroGlobe: () => <div data-testid="hero-globe" /> }));
vi.mock("./live-stats", () => ({ LiveStats: () => <div data-testid="live-stats" /> }));

describe("Hero", () => {

  it("links to the main exploration view (CA01)", () => {
    render(<Hero />);
    expect(screen.getByRole("link", { name: /Explore hotspots/ })).toHaveAttribute(
      "href",
      "/explore/map",
    );
  });

});
