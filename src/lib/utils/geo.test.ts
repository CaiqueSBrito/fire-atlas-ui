import { describe, expect, it } from "vitest";
import { latLonToVector3, vectorToLatLon } from "./geo";

describe("vectorToLatLon", () => {
  it.each([
    [0, 0],
    [-10, -55],
    [45, 120],
    [-33, 148],
    [60, -170],
    [-60, 30],
  ])("é a inversa de latLonToVector3 em (%d, %d)", (lat, lon) => {
    const back = vectorToLatLon(latLonToVector3(lat, lon, 1));
    expect(back.lat).toBeCloseTo(lat, 6);
    expect(back.lon).toBeCloseTo(lon, 6);
  });

  it("não depende do raio", () => {
    const back = vectorToLatLon(latLonToVector3(-10, -55, 3.7));
    expect(back.lat).toBeCloseTo(-10, 6);
    expect(back.lon).toBeCloseTo(-55, 6);
  });

  it("polos têm latitude ±90", () => {
    expect(vectorToLatLon({ x: 0, y: 1, z: 0 }).lat).toBeCloseTo(90, 6);
    expect(vectorToLatLon({ x: 0, y: -1, z: 0 }).lat).toBeCloseTo(-90, 6);
  });

  it("vetor nulo não quebra", () => {
    const { lat, lon } = vectorToLatLon({ x: 0, y: 0, z: 0 });
    expect(Number.isFinite(lat)).toBe(true);
    expect(Number.isFinite(lon)).toBe(true);
  });
});
