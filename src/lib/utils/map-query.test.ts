import { describe, expect, it } from "vitest";
import { existingLayers } from "./map-query";

const mapWith = (...ids: string[]) => ({ getLayer: (id: string) => (ids.includes(id) ? { id } : undefined) });

describe("existingLayers", () => {
  it("antes do estilo carregar nenhuma camada existe", () => {
    expect(existingLayers(mapWith(), ["viirs", "modis", "hex-fill"])).toEqual([]);
  });

  it("devolve só as camadas que já foram criadas, na ordem pedida", () => {
    expect(existingLayers(mapWith("modis", "hex-fill"), ["viirs", "modis", "hex-fill"])).toEqual([
      "modis",
      "hex-fill",
    ]);
  });

  it("com todas as camadas devolve a lista inteira", () => {
    expect(existingLayers(mapWith("viirs", "modis"), ["viirs", "modis"])).toEqual(["viirs", "modis"]);
  });

  it("lista vazia de ids resulta em lista vazia", () => {
    expect(existingLayers(mapWith("viirs"), [])).toEqual([]);
  });
});
