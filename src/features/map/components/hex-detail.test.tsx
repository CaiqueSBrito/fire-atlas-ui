import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { HexCell } from "@/lib/utils/hex";
import { HexDetail, HexTopList } from "./hex-detail";

const cell = (over: Partial<HexCell> = {}): HexCell => ({
  id: "8481635ffffffff",
  res: 4,
  count: 37,
  modis: 12,
  viirs: 25,
  center: [-49.92, -10.09],
  edgeKm: 26.1,
  ...over,
});

describe("HexDetail", () => {
  it("mostra a contagem total e por sensor", () => {
    render(<HexDetail cell={cell()} shown={100} total={100} truncated={false} onClose={vi.fn()} />);
    const region = screen.getByRole("region", { name: "Hexágono H3" });
    expect(region).toHaveTextContent("Focos na célula37");
    expect(region).toHaveTextContent("◆ MODIS12");
    expect(region).toHaveTextContent("● VIIRS25");
  });

  it("informa resolução, tamanho, centro e identificador da célula", () => {
    render(<HexDetail cell={cell()} shown={1} total={1} truncated={false} onClose={vi.fn()} />);
    const region = screen.getByRole("region", { name: "Hexágono H3" });
    expect(region).toHaveTextContent("4 (aresta ≈ 26,1 km)");
    expect(region).toHaveTextContent("-10.090°, -49.920°");
    expect(region).toHaveTextContent("8481635ffffffff");
  });

  it("avisa que a contagem é parcial quando os pontos foram truncados", () => {
    render(<HexDetail cell={cell()} shown={2497} total={4577} truncated onClose={vi.fn()} />);
    expect(screen.getByText(/Contagem sobre os 2\.497 pontos exibidos, de 4\.577 no recorte/)).toBeInTheDocument();
  });

  it("não mostra o aviso de contagem parcial quando todos os pontos estão carregados", () => {
    render(<HexDetail cell={cell()} shown={10} total={10} truncated={false} onClose={vi.fn()} />);
    expect(screen.queryByText(/Contagem sobre os/)).not.toBeInTheDocument();
  });

  it("fecha pelo botão", async () => {
    const onClose = vi.fn();
    render(<HexDetail cell={cell()} shown={1} total={1} truncated={false} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("HexTopList", () => {
  const cells = [cell({ id: "a", count: 40 }), cell({ id: "b", count: 12, modis: 2, viirs: 10 })];

  it("não renderiza nada sem células", () => {
    const { container } = render(<HexTopList cells={[]} selectedId={null} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lista as células com contagem e sensores", () => {
    render(<HexTopList cells={cells} selectedId={null} onSelect={vi.fn()} />);
    const items = within(screen.getByRole("list")).getAllByRole("button");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("40");
    expect(items[1]).toHaveTextContent("12");
    expect(items[1]).toHaveTextContent("◆ 2");
    expect(items[1]).toHaveTextContent("● 10");
  });

  it("seleciona uma célula e marca a escolhida (alternativa por teclado)", async () => {
    const onSelect = vi.fn();
    render(<HexTopList cells={cells} selectedId="b" onSelect={onSelect} />);
    const items = screen.getAllByRole("button");
    expect(items[0]).toHaveAttribute("aria-pressed", "false");
    expect(items[1]).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(items[0]);
    expect(onSelect).toHaveBeenCalledWith(cells[0]);
  });
});
