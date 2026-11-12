import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

async function load() {
  vi.resetModules();
  return (await import("./webgl")).supportsWebGL;
}

describe("supportsWebGL", () => {
  it("é falso quando o ambiente não define WebGL", async () => {
    const supportsWebGL = await load();
    expect(supportsWebGL()).toBe(false);
  });

  it("é verdadeiro quando o navegador entrega um contexto", async () => {
    vi.stubGlobal("WebGLRenderingContext", class {});
    const loseContext = vi.fn();
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({ getExtension: () => ({ loseContext }) } as never);
    const supportsWebGL = await load();
    expect(supportsWebGL()).toBe(true);
    expect(getContext).toHaveBeenCalled();
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it("é falso quando a criação do contexto falha", async () => {
    vi.stubGlobal("WebGLRenderingContext", class {});
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const supportsWebGL = await load();
    expect(supportsWebGL()).toBe(false);
  });

  it("é falso quando criar o contexto lança erro", async () => {
    vi.stubGlobal("WebGLRenderingContext", class {});
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      throw new Error("sem gpu");
    });
    const supportsWebGL = await load();
    expect(supportsWebGL()).toBe(false);
  });

  it("guarda o resultado e não cria um contexto a cada chamada", async () => {
    vi.stubGlobal("WebGLRenderingContext", class {});
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({ getExtension: () => null } as never);
    const supportsWebGL = await load();
    supportsWebGL();
    supportsWebGL();
    supportsWebGL();
    expect(getContext).toHaveBeenCalledTimes(1);
  });
});
