import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HowItWorks } from "./how-it-works";

describe("HowItWorks", () => {
  it("mostra os quatro passos, o último sobre a previsão", () => {
    render(<HowItWorks />);
    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(steps[3]).toHaveTextContent("Passo 4");
    expect(steps[3]).toHaveTextContent("Antecipe com a previsão");
    expect(steps[3]).toHaveTextContent("não uma detecção observada");
  });
});
