import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { HistoryComparison } from "./history-comparison";
import { RankingPanel } from "./insight-panels";

describe("Statistics panels", () => {
  it("seleciona uma célula do ranking sem perder a alternativa por teclado", async () => {
    const onSelectCell = vi.fn();
    render(
      <RankingPanel
        selectedCell="838141fffffffff"
        onSelectCell={onSelectCell}
        ranking={{
          criterion: "Contagem",
          rule: "Decrescente",
          unit: "detections",
          items: [
            { h3: "838141fffffffff", label: "Cell A", value: 120 },
            { h3: "835f23fffffffff", label: "Cell B", value: 100 },
          ],
        }}
      />,
    );
    const buttons = within(screen.getByRole("region", { name: "Location ranking" })).getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "false");
    buttons[1].focus();
    await userEvent.keyboard("{Enter}");
    expect(onSelectCell).toHaveBeenCalledWith("835f23fffffffff");
  });

  it("repete a consulta histórica após uma falha recuperável", async () => {
    const onRetry = vi.fn();
    render(
      <HistoryComparison
        enabled
        cell="838141fffffffff"
        history={null}
        isPending={false}
        error={new ApiError("Serviço indisponível")}
        onRetry={onRetry}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("não oferece repetir uma consulta histórica não recuperável", () => {
    render(
      <HistoryComparison
        enabled
        cell="838141fffffffff"
        history={null}
        isPending={false}
        error={new ApiError("Acesso negado", 403, false)}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });
});

