import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TEAM, Team } from "./team";

describe("Team", () => {
  it("mostra um card por pessoa com foto, nome e função", () => {
    render(<Team />);
    expect(screen.getByRole("heading", { level: 2, name: "Nosso time" })).toBeInTheDocument();
    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(TEAM.length);
    for (const [i, m] of TEAM.entries()) {
      expect(within(cards[i]).getByRole("heading", { level: 3, name: m.name })).toBeInTheDocument();
      expect(within(cards[i]).getByText(m.role)).toBeInTheDocument();
      expect(within(cards[i]).getByRole("img", { name: `Foto de ${m.name}` })).toBeInTheDocument();
    }
  });

  it("a Ana aparece como Team Owner e Product Owner, só ela com o selo", () => {
    render(<Team />);
    expect(screen.getAllByText("Team Owner")).toHaveLength(1);
    const ana = screen.getByRole("heading", { name: "Ana Beatriz Costa Alves" }).closest("li")!;
    expect(within(ana).getByText("Team Owner")).toBeInTheDocument();
    expect(within(ana).getByText("Product Owner")).toBeInTheDocument();
  });
});
