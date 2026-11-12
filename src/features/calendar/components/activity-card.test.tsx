import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getRegion } from "@/config/regions";
import type { DayResponse } from "@/types/calendar";
import { GEOGRAPHIC, THERMAL, makeDay } from "@/test/fixtures";
import { ActivityCard } from "./activity-card";

const bahia = getRegion("bahia");

function setup(data: DayResponse, view: "thermal" | "geographic" | null = null) {
  render(<ActivityCard data={data} region={bahia} view={view} />);
  return screen.getByRole("article");
}

describe("ActivityCard — frente da carta (RN04)", () => {
  it("mostra região, data, horário e contagem por sensor", () => {
    const card = setup(makeDay("2026-11-04", "bahia"));
    expect(card).toHaveAccessibleName("Carta de Bahia em 04/11/2026");
    expect(within(card).getByRole("heading", { name: "Bahia" })).toBeInTheDocument();
    expect(within(card).getByText("04/11/2026")).toBeInTheDocument();
    expect(within(card).getByText("Dia inteiro")).toBeInTheDocument();
    expect(within(card).getByText("Focos MODIS").nextSibling).toHaveTextContent("3");
    expect(within(card).getByText("Focos VIIRS").nextSibling).toHaveTextContent("5");
    expect(within(card).getByText("Total detectado").nextSibling).toHaveTextContent("8");
  });

  it("traduz o horário da passagem", () => {
    const base = makeDay("2026-11-04", "bahia", "night");
    const card = setup(base);
    expect(within(card).getByText("Passagem noturna")).toBeInTheDocument();
  });

  it("só mostra os sensores que a API informou", () => {
    const data = { ...makeDay("2026-11-04", "bahia"), counts: { VIIRS: 9 } };
    const card = setup(data);
    expect(within(card).queryByText("Focos MODIS")).toBeNull();
    expect(within(card).getByText("Focos VIIRS").nextSibling).toHaveTextContent("9");
    expect(within(card).getByText("Total detectado").nextSibling).toHaveTextContent("9");
  });

  it("sem contagens da API, não mostra números nem total", () => {
    const data = { ...makeDay("2026-11-04", "bahia"), counts: undefined };
    const card = setup(data);
    expect(within(card).queryByText(/Focos/)).toBeNull();
    expect(within(card).queryByText("Total detectado")).toBeNull();
  });
});

describe("ActivityCard — estados da data (RN07 / CA04)", () => {
  it("dados indisponíveis: avisa e não exibe detecções nem números", () => {
    const card = setup(makeDay("2026-11-06", "bahia")); // 6 % 3 === 0
    expect(within(card).getAllByText(/Dados indisponíveis/).length).toBeGreaterThan(0);
    expect(within(card).queryByText(/Focos/)).toBeNull();
    expect(within(card).queryByText("Total detectado")).toBeNull();
    expect(within(card).queryByRole("img", { name: /Posição das/ })).toBeNull();
  });

  it("sem registro: distingue 'zero detecções' de 'indisponível'", () => {
    const card = setup(makeDay("2026-11-05", "bahia")); // 5 % 3 === 2
    expect(
      within(card).getByText(/Nenhum foco registrado \(dado disponível, zero detecções\)/),
    ).toBeInTheDocument();
    expect(within(card).queryByText(/Dados indisponíveis/)).toBeNull();
  });

  it("indisponível não é confundido com atividade", () => {
    const unavailable = makeDay("2026-11-06", "bahia");
    expect(unavailable.status).toBe("unavailable");
    expect(unavailable.detections).toHaveLength(0);
  });
});

describe("ActivityCard — imagens e proveniência (RN07)", () => {
  it("sem imagens: usa o gráfico das detecções e cita a fonte", () => {
    const card = setup(makeDay("2026-11-04", "bahia"));
    expect(
      within(card).getByRole("img", { name: "Posição das 8 detecções em Bahia" }),
    ).toBeInTheDocument();
    expect(within(card).getByText(/Fonte: Fonte de teste/)).toBeInTheDocument();
  });

  it("imagem térmica disponível e pedida: mostra imagem com fonte e data", () => {
    const card = setup(
      makeDay("2026-11-04", "bahia", "all", [THERMAL, GEOGRAPHIC]),
      "thermal",
    );
    const img = within(card).getByRole("img", { name: /térmica de Bahia/ });
    expect(img).toHaveAttribute("src", THERMAL.url);
    expect(
      within(card).getByText("Fonte: NASA GIBS · imagem de 04/11/2026"),
    ).toBeInTheDocument();
  });

  it("imagem geográfica: usa a fonte e a data da própria imagem", () => {
    const card = setup(
      makeDay("2026-11-04", "bahia", "all", [THERMAL, GEOGRAPHIC]),
      "geographic",
    );
    expect(within(card).getByRole("img", { name: /geográfica de Bahia/ })).toHaveAttribute(
      "src",
      GEOGRAPHIC.url,
    );
    expect(
      within(card).getByText("Fonte: Sentinel-2 · imagem de 04/11/2026"),
    ).toBeInTheDocument();
  });

  it("imagem pedida mas inexistente: volta ao gráfico, sem inventar imagem", () => {
    const card = setup(makeDay("2026-11-04", "bahia", "all", [THERMAL]), "geographic");
    expect(within(card).queryByRole("img", { name: /geográfica/ })).toBeNull();
    expect(within(card).getByRole("img", { name: /Posição das/ })).toBeInTheDocument();
  });
});

describe("ActivityCard — origem dos dados", () => {
  it("sinaliza dados simulados", () => {
    const card = setup(makeDay("2026-11-04", "bahia"));
    expect(within(card).getByText("Protótipo · dados simulados")).toBeInTheDocument();
  });

  it("não sinaliza como simulado quando a fonte é real", () => {
    const data = makeDay("2026-11-04", "bahia");
    const card = setup({ ...data, source: { name: "NASA FIRMS", simulated: false } });
    expect(within(card).queryByText(/dados simulados/)).toBeNull();
    expect(within(card).getByText(/Fonte: NASA FIRMS/)).toBeInTheDocument();
  });
});
