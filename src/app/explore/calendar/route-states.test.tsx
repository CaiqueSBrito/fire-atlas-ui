import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Error from "./error";
import Loading from "./loading";

describe("loading.tsx (RN05)", () => {
  it("mostra o esqueleto com indicação de carregamento", () => {
    render(<Loading />);
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "conteudo");
    expect(main).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Carregando calendário…");
  });
});

describe("error.tsx (RN05 — nova tentativa)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("informa a falha e chama retry ao tentar de novo", async () => {
    const retry = vi.fn();
    render(<Error error={new globalThis.Error("boom")} retry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar o calendário",
    );
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("registra o erro no console", () => {
    const err = new globalThis.Error("boom");
    render(<Error error={err} retry={() => {}} />);
    expect(console.error).toHaveBeenCalledWith(err);
  });

  it("mantém o alvo do link 'pular para o conteúdo'", () => {
    render(<Error error="x" retry={() => {}} />);
    expect(screen.getByRole("main")).toHaveAttribute("id", "conteudo");
  });
});
