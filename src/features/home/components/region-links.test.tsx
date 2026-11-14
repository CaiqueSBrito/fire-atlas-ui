import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { peekIntroFly } from "@/lib/utils/intro-fly";
import { RegionLinks } from "./region-links";

afterEach(() => {
  sessionStorage.clear();
});

describe("RegionLinks", () => {
  it("lista os seis continentes como links do mapa", () => {
    render(<RegionLinks />);
    const nav = screen.getByRole("navigation", { name: "Explorar por região" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      "América do Norte",
      "América do Sul",
      "Europa",
      "África",
      "Ásia",
      "Oceania",
    ]);
    expect(links[1]).toHaveAttribute("href", "/explore/map?region=south-america");
    expect(links[3]).toHaveAttribute("href", "/explore/map?region=africa");
  });

  it("não inclui o mundo nem regiões menores", () => {
    render(<RegionLinks />);
    expect(screen.queryByRole("link", { name: "Mundo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Bahia" })).not.toBeInTheDocument();
  });

  it("clicar marca o voo de entrada", async () => {
    render(<RegionLinks />);
    expect(peekIntroFly()).toBe(false);
    await userEvent.click(screen.getByRole("link", { name: "Europa" }));
    expect(peekIntroFly()).toBe(true);
  });

  it("é navegável por teclado (alternativa ao clique no globo)", async () => {
    render(<RegionLinks />);
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "América do Norte" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "América do Sul" })).toHaveFocus();
  });
});
