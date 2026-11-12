import { describe, expect, it } from "vitest";
import {
  BASEMAPS,
  BASEMAP_OPTIONS,
  IMAGERY_LAG_DAYS,
  ILLUSTRATED_PALETTE,
  NDVI_RAMP,
  TEMPERATURE_RAMP,
  TEMPERATURE_STOPS,
  gibsTiles,
  imageryDateFor,
  temperatureDateFor,
} from "./map-layers";

describe("imageryDateFor", () => {
  const today = "2026-11-12";

  it("sem data usa a imagem mais recente disponível (com atraso)", () => {
    expect(imageryDateFor(undefined, today)).toBe("2026-11-09");
    expect(IMAGERY_LAG_DAYS).toBe(3);
  });

  it("datas antigas são mantidas", () => {
    expect(imageryDateFor("2026-03-10", today)).toBe("2026-03-10");
  });

  it("datas recentes ou futuras são limitadas ao último dia disponível", () => {
    expect(imageryDateFor("2026-11-12", today)).toBe("2026-11-09");
    expect(imageryDateFor("2099-01-01", today)).toBe("2026-11-09");
  });

  it("a data limite exata é aceita", () => {
    expect(imageryDateFor("2026-11-09", today)).toBe("2026-11-09");
  });
});

describe("gibsTiles", () => {
  it("monta a URL de vegetação com a data", () => {
    const veg = gibsTiles.vegetation("2026-11-05");
    expect(veg).toContain("MODIS_Terra_NDVI_8Day/default/2026-11-05/");
    expect(veg).toMatch(/^https:\/\/gibs\.earthdata\.nasa\.gov\//);
    expect(veg).toContain("{z}/{y}/{x}.png");
  });
});

describe("temperatureDateFor", () => {
  const today = "2026-11-12";
  it("mantém datas passadas", () => {
    expect(temperatureDateFor("2026-03-10", today)).toBe("2026-03-10");
  });
  it("limita hoje e o futuro a hoje", () => {
    expect(temperatureDateFor("2026-11-12", today)).toBe("2026-11-12");
    expect(temperatureDateFor("2099-01-01", today)).toBe("2026-11-12");
    expect(temperatureDateFor(undefined, today)).toBe("2026-11-12");
  });
});

describe("mapas base", () => {
  it("oferece satélite, satélite com vegetação e ilustrado", () => {
    expect(BASEMAPS).toEqual(["satellite", "vegetation", "illustrated"]);
    expect(BASEMAP_OPTIONS.map((o) => o.id)).toEqual([...BASEMAPS]);
  });

  it("todas as opções têm rótulo e descrição", () => {
    for (const o of BASEMAP_OPTIONS) {
      expect(o.label.length).toBeGreaterThan(2);
      expect(o.description.length).toBeGreaterThan(10);
    }
  });

  it("a paleta ilustrada cobre os índices de cor de países (9) e estados (13)", () => {
    expect(ILLUSTRATED_PALETTE.countries).toHaveLength(9);
    expect(ILLUSTRATED_PALETTE.states).toHaveLength(13);
    for (const c of [...ILLUSTRATED_PALETTE.countries, ...ILLUSTRATED_PALETTE.states]) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("no mapa ilustrado os países são cinza mais escuro que o oceano", () => {
    const light = (hex: string) =>
      [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0) / 3;
    const ocean = light(ILLUSTRATED_PALETTE.ocean);
    for (const c of [...ILLUSTRATED_PALETTE.countries, ...ILLUSTRATED_PALETTE.states]) {
      expect(light(c)).toBeLessThan(ocean - 25);
    }
  });

  it("todas as cores ilustradas são cinzas (matiz neutra)", () => {
    for (const c of [
      ILLUSTRATED_PALETTE.ocean,
      ...ILLUSTRATED_PALETTE.countries,
      ...ILLUSTRATED_PALETTE.states,
    ]) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
      expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(4);
    }
  });

  it("a legenda de temperatura cobre a escala usada no mapa", () => {
    expect(TEMPERATURE_RAMP.low).toBe("≤ −10 °C");
    expect(TEMPERATURE_RAMP.high).toBe("≥ 43 °C");
    expect(TEMPERATURE_RAMP.colors).toHaveLength(TEMPERATURE_STOPS.length);
    expect(TEMPERATURE_RAMP.colors[0]).toBe("#3b4cc0 0.0%");
    expect(TEMPERATURE_RAMP.colors.at(-1)).toBe("#8b0a0a 100.0%");
  });

  it("a legenda de vegetação traz os extremos oficiais do NDVI", () => {
    expect(NDVI_RAMP.low).toContain("0,1");
    expect(NDVI_RAMP.high).toContain("1,0");
  });

});
