import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "./error-state";

describe("ErrorState (RN05 / CA04 da Home)", () => {
  it("anuncia o erro como alerta, com título e mensagem", () => {
    render(<ErrorState title="Falhou" message="Tente de novo." />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Falhou");
    expect(alert).toHaveTextContent("Tente de novo.");
  });

  it("oferece nova tentativa quando há onRetry", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("não mostra o botão quando o erro não é recuperável", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("usa textos padrão em português", () => {
    render(<ErrorState />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os dados",
    );
  });
});
