import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { FilterBar } from "./filter-bar";

const lastQuery = (fn: ReturnType<typeof vi.fn>) =>
  fn.mock.calls.at(-1)?.[0].queryString as string;

describe("FilterBar", () => {
  it("começa com os dois sensores ativos e sem 'Limpar filtros'", () => {
    renderWithProviders(<FilterBar />);
    expect(screen.getByRole("checkbox", { name: /MODIS/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /VIIRS/ })).toBeChecked();
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();
  });

  it("desativa um sensor sem afetar o outro e grava na URL", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, { onUrlUpdate });
    await userEvent.click(screen.getByRole("checkbox", { name: /MODIS/ }));
    expect(screen.getByRole("checkbox", { name: /MODIS/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /VIIRS/ })).toBeChecked();
    expect(lastQuery(onUrlUpdate)).toContain("sensors=viirs");
  });

  it("permite ativar os dois ao mesmo tempo de novo", async () => {
    renderWithProviders(<FilterBar />, { searchParams: "?sensors=viirs" });
    expect(screen.getByRole("checkbox", { name: /MODIS/ })).not.toBeChecked();
    await userEvent.click(screen.getByRole("checkbox", { name: /MODIS/ }));
    expect(screen.getByRole("checkbox", { name: /MODIS/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /VIIRS/ })).toBeChecked();
  });

  it("lê o período da URL", () => {
    renderWithProviders(<FilterBar />, { searchParams: "?from=2026-03-01&to=2026-03-10" });
    expect(screen.getByLabelText("De")).toHaveValue("2026-03-01");
    expect(screen.getByLabelText("Até")).toHaveValue("2026-03-10");
  });

  it("grava a data inicial na URL", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, { onUrlUpdate });
    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-01-05" } });
    await waitFor(() => expect(lastQuery(onUrlUpdate)).toContain("from=2026-01-05"));
  });

  it("usa o dia do calendário como período quando não há from/to", () => {
    renderWithProviders(<FilterBar />, { searchParams: "?date=2026-03-05" });
    expect(screen.getByLabelText("De")).toHaveValue("2026-03-05");
    expect(screen.getByLabelText("Até")).toHaveValue("2026-03-05");
  });

  it("avisa quando o período está invertido", () => {
    renderWithProviders(<FilterBar />, { searchParams: "?from=2026-05-10&to=2026-05-01" });
    expect(screen.getByRole("alert")).toHaveTextContent(/posterior/);
  });

  it("mostra a região vinda da URL", () => {
    renderWithProviders(<FilterBar />, { searchParams: "?region=brasil" });
    expect(screen.getByRole("combobox", { name: /Região/ })).toHaveTextContent("Brasil");
  });

  it("indica área personalizada quando há bbox válido", () => {
    renderWithProviders(<FilterBar />, { searchParams: "?bbox=-60,-10,-50,0" });
    expect(screen.getByRole("combobox", { name: /Região/ })).toHaveTextContent("Área personalizada");
  });

  it("'Limpar filtros' aparece com filtros ativos e restaura o padrão", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<FilterBar />, {
      searchParams: "?sensors=viirs&region=brasil&from=2026-03-01&date=2026-03-05",
      onUrlUpdate,
    });
    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(lastQuery(onUrlUpdate)).toBe("");
    expect(screen.getByRole("checkbox", { name: /MODIS/ })).toBeChecked();
    expect(screen.getByRole("combobox", { name: /Região/ })).toHaveTextContent("Mundo");
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();
  });
});
