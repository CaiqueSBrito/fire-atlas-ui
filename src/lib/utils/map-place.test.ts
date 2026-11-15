import { afterEach, describe, expect, it, vi } from "vitest";
import { hexBbox, parseMapPlace, readMapPlaceRaw, saveMapPlace, subscribeMapPlace } from "./map-place";

afterEach(() => sessionStorage.clear());

describe("map-place", () => {
  it("guarda e lê o lugar do mapa principal", () => {
    saveMapPlace({ region: "south-america", bbox: [-56, -12, -54, -10] });
    expect(parseMapPlace(readMapPlaceRaw())).toEqual({ region: "south-america", bbox: [-56, -12, -54, -10] });
  });

  it("avisa quem está ouvindo só quando o lugar muda", () => {
    const onChange = vi.fn();
    const off = subscribeMapPlace(onChange);
    saveMapPlace({ region: "world", bbox: [-10, -10, 10, 10] });
    saveMapPlace({ region: "world", bbox: [-10, -10, 10, 10] });
    expect(onChange).toHaveBeenCalledTimes(1);
    off();
  });

  it("valor inválido ou ausente vira nulo", () => {
    expect(parseMapPlace(null)).toBeNull();
    expect(parseMapPlace("world|x")).toBeNull();
    expect(parseMapPlace("world|10,0,5,10")).toBeNull();
  });

  it("hexBbox envolve o hexágono", () => {
    const [w, s, e, n] = hexBbox("848048dffffffff");
    expect(w).toBeLessThan(e);
    expect(s).toBeLessThan(n);
    expect(e - w).toBeLessThan(2);
  });
});
