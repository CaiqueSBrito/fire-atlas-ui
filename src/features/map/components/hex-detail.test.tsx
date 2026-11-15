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
    const region = screen.getByRole("region", { name: "Hexágono H3" });
    expect(region).toHaveTextContent("Focos na célula37");
    expect(region).toHaveTextContent("◆ MODIS12");
    expect(region).toHaveTextContent("● VIIRS25");
  });

  it("informa resolução, tamanho, centro e identificador da célula", () => {
    render(<HexDetail view3d={false} onToggle3d={() => {}} cell={cell()} shown={1} total={1} truncated={false} onClose={vi.fn()} />);
    const region = screen.getByRole("region", { name: "Hexágono H3" });
    expect(region).toHaveTextContent("4 (aresta ≈ 26,1 km)");
    expect(region).toHaveTextContent("-10.090°, -49.920°");
    expect(region).toHaveTextContent("8481635ffffffff");
  });

  it("avisa que a contagem é parcial quando os pontos foram truncados", () => {
    render(<HexDetail view3d={false} onToggle3d={() => {}} cell={cell()} shown={2497} total={4577} truncated onClose={vi.fn()} />);
    expect(screen.getByText(/Contagem sobre os 2\.497 pontos exibidos, de 4\.577 no recorte/)).toBeInTheDocument();
  });

  it("não mostra o aviso de contagem parcial quando todos os pontos estão carregados", () => {
    render(<HexDetail view3d={false} onToggle3d={() => {}} cell={cell()} shown={10} total={10} truncated={false} onClose={vi.fn()} />);
    expect(screen.queryByText(/Contagem sobre os/)).not.toBeInTheDocument();
  });

  it("fecha pelo botão", async () => {
    const onClose = vi.fn();
    render(<HexDetail view3d={false} onToggle3d={() => {}} cell={cell()} shown={1} total={1} truncated={false} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("HexDetail — vista 3D", () => {
  it("oferece 'Ver em 3D' e alterna ao clicar", async () => {
    const onToggle3d = vi.fn();
    render(
      <HexDetail cell={cell()} shown={1} total={1} truncated={false} view3d={false} onToggle3d={onToggle3d} onClose={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Ver em 3D" }));
    expect(onToggle3d).toHaveBeenCalledOnce();
  });

  it("mostra 'Voltar ao 2D' quando já está em 3D", () => {
    render(
      <HexDetail cell={cell()} shown={1} total={1} truncated={false} view3d onToggle3d={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Voltar ao 2D" })).toBeInTheDocument();
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

describe("HexDetail — atividade harmonizada e período", () => {
  const base = {
    id: "868103437ffffff",
    res: 6,
    center: [-41.673, -11.556] as [number, number],
    edgeKm: 3.7,
  };
  const props = {
    shown: 0,
    total: 0,
    truncated: false,
    view3d: false,
    onToggle3d: () => {},
    onClose: () => {},
    harmonizedUnit: "Atividade de fogo harmonizada (células ativas equivalentes ao MODIS Aqua)",
    period: { from: "2026-11-08", to: "2026-11-14" },
  };

  it("mostra o período consultado, os dias com atividade e os dias com dado", () => {
    render(
      <HexDetail
        {...props}
        cell={{ ...base, count: 12.5, modis: 3, viirs: 9, activity: { firstDay: "2026-11-09", lastDay: "2026-11-12", daysWithData: 6 } }}
      />,
    );
    expect(screen.getByText("08/11/2026 a 14/11/2026")).toBeInTheDocument();
    expect(screen.getByText("de 09/11/2026 a 12/11/2026")).toBeInTheDocument();
    expect(screen.getByText("6 dias")).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("valor 0 com detecção continua 0 e explica quando houve a detecção", () => {
    render(
      <HexDetail
        {...props}
        cell={{ ...base, count: 0, modis: 1, viirs: 0, activity: { firstDay: "2026-11-11", lastDay: "2026-11-11", daysWithData: 1 } }}
      />,
    );
    expect(screen.getByText("Atividade harmonizada").nextElementSibling).toHaveTextContent(/^0$/);
    expect(screen.getByText("em 11/11/2026")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Houve 1 detecção de satélite em 11/11/2026");
    expect(screen.getByRole("note")).toHaveTextContent("a harmonização não confirmou atividade");
  });
});
