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
    render(<HexDetail view3d={false} onToggle3d={() => {}} cell={cell()} shown={100} total={100} truncated={false} onClose={vi.fn()} />);
    const region = screen.getByRole("region", { name: "H3 hexagon" });
    expect(region).toHaveTextContent("Fire detections in cell37");
    expect(region).toHaveTextContent("◆ MODIS12");
    expect(region).toHaveTextContent("● VIIRS25");
  });

  it("informa resolução, tamanho, centro e identificador da célula", () => {
    render(<HexDetail view3d={false} onToggle3d={() => {}} cell={cell()} shown={1} total={1} truncated={false} onClose={vi.fn()} />);
    const region = screen.getByRole("region", { name: "H3 hexagon" });
    expect(region).toHaveTextContent("4 (edge ≈ 26.1 km)");
    expect(region).toHaveTextContent("-10.090°, -49.920°");
    expect(region).toHaveTextContent("8481635ffffffff");
  });


  it("não mostra o aviso de contagem parcial quando todos os pontos estão carregados", () => {
    render(<HexDetail view3d={false} onToggle3d={() => {}} cell={cell()} shown={10} total={10} truncated={false} onClose={vi.fn()} />);
    expect(screen.queryByText(/Count based on the/)).not.toBeInTheDocument();
  });

  it("fecha pelo botão", async () => {
    const onClose = vi.fn();
    render(<HexDetail view3d={false} onToggle3d={() => {}} cell={cell()} shown={1} total={1} truncated={false} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("HexDetail — vista 3D", () => {
  it("oferece 'Ver em 3D' e alterna ao clicar", async () => {
    const onToggle3d = vi.fn();
    render(
      <HexDetail cell={cell()} shown={1} total={1} truncated={false} view3d={false} onToggle3d={onToggle3d} onClose={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "View in 3D" }));
    expect(onToggle3d).toHaveBeenCalledOnce();
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
