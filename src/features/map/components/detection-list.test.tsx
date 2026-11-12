import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { detection } from "@/test/detection-fixtures";
import { DetectionList } from "./detection-list";

describe("DetectionList", () => {
  it("não renderiza nada sem detecções", () => {
    const { container } = render(
      <DetectionList items={[]} total={0} selectedId={null} onSelect={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("ordena por FRP decrescente e deixa FRP ausente por último", () => {
    const items = [
      detection({ id: "a", frp: 10 }),
      detection({ id: "b", frp: null }),
      detection({ id: "c", frp: 300 }),
    ];
    render(<DetectionList items={items} total={3} selectedId={null} onSelect={vi.fn()} />);
    const rows = within(screen.getByRole("list")).getAllByRole("button");
    expect(rows[0]).toHaveTextContent("300 MW");
    expect(rows[1]).toHaveTextContent("10 MW");
    expect(rows[2]).toHaveTextContent("Não informado");
  });

  it("limita a 15 itens e informa o total", () => {
    const items = Array.from({ length: 40 }, (_, i) => detection({ id: `d${i}`, frp: i }));
    render(<DetectionList items={items} total={4000} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(15);
    expect(screen.getByText(/Mostrando 15 de 4\.000/)).toBeInTheDocument();
  });

  it("identifica o sensor por símbolo e texto", () => {
    const items = [detection({ id: "m", sensor: "modis" }), detection({ id: "v", sensor: "viirs", frp: 1 })];
    render(<DetectionList items={items} total={2} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getByText("MODIS")).toBeInTheDocument();
    expect(screen.getByText("VIIRS")).toBeInTheDocument();
    expect(screen.getByText("◆")).toBeInTheDocument();
    expect(screen.getByText("●")).toBeInTheDocument();
  });

  it("chama onSelect e marca o item selecionado", async () => {
    const onSelect = vi.fn();
    const items = [detection({ id: "a", frp: 5 }), detection({ id: "b", frp: 9 })];
    render(<DetectionList items={items} total={2} selectedId="b" onSelect={onSelect} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(buttons[1]);
    expect(onSelect).toHaveBeenCalledWith("a");
  });
});
