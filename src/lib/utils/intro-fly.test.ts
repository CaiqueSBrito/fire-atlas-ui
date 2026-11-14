import { afterEach, describe, expect, it, vi } from "vitest";
import { clearIntroFly, markIntroFly, peekIntroFly } from "./intro-fly";

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("intro-fly", () => {
  it("começa sem a marca", () => {
    expect(peekIntroFly()).toBe(false);
  });

  it("marca e lê sem consumir", () => {
    markIntroFly();
    expect(peekIntroFly()).toBe(true);
    expect(peekIntroFly()).toBe(true);
  });

  it("limpa a marca", () => {
    markIntroFly();
    clearIntroFly();
    expect(peekIntroFly()).toBe(false);
  });

  it("não quebra quando o armazenamento está bloqueado", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(() => markIntroFly()).not.toThrow();
    expect(peekIntroFly()).toBe(false);
    expect(() => clearIntroFly()).not.toThrow();
  });
});
