import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HarmonizedMonthlyPanel } from "./harmonized-monthly";


describe("HarmonizedMonthlyPanel", () => {
  it("sem API configurada não mostra nada", () => {
    const { container } = render(
      <HarmonizedMonthlyPanel data={null} isPending={false} error={null} onRetry={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });


  it("falha permite tentar novamente", async () => {
    const onRetry = vi.fn();
    render(<HarmonizedMonthlyPanel data={undefined} isPending={false} error={new Error("x")} onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(onRetry).toHaveBeenCalled();
  });

});
