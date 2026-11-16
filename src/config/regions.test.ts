import { describe, expect, it } from "vitest";
import { validateBbox } from "@/lib/utils/bbox";
import { DEFAULT_REGION_ID, REGIONS, getRegion } from "./regions";

const CONTINENT_IDS = ["north-america", "south-america", "europe", "africa", "asia", "oceania"];

describe("regiões", () => {
  it("o mundo é a primeira e a padrão", () => {
    expect(REGIONS[0].id).toBe("world");
    expect(DEFAULT_REGION_ID).toBe("world");
  });

  it("tem os seis continentes", () => {
    for (const id of CONTINENT_IDS) {
      expect(REGIONS.some((r) => r.id === id)).toBe(true);
    }
  });

  it("ids são únicos", () => {
    const ids = REGIONS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("todas as caixas são geograficamente válidas", () => {
    for (const r of REGIONS) {
      expect(validateBbox(r.bbox)).toBeNull();
    }
  });

  it("id desconhecido volta para o mundo", () => {
    expect(getRegion("atlantida").id).toBe("world");
    expect(getRegion(null).id).toBe("world");
  });

});
