import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bbox } from "@/types/detections";
import { useQueryArea } from "./use-query-area";

const REGION: Bbox = [-74, -34, -34, 6];
const VIEW: Bbox = [-60, -10, -50, 0];

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const settle = () => act(() => vi.advanceTimersByTimeAsync(400));

describe("useQueryArea", () => {
  it("sem área visível usa a região", () => {
    const { result } = renderHook(() => useQueryArea(null, REGION, true));
    expect(result.current).toBe(REGION);
  });

  it("desligado (dados simulados ou área desenhada) sempre usa a região", async () => {
    const { result } = renderHook(() => useQueryArea(VIEW, REGION, false));
    await settle();
    expect(result.current).toBe(REGION);
  });

  it("espera o mapa parar de mexer antes de trocar a consulta", async () => {
    const { result, rerender } = renderHook(
      ({ view }: { view: Bbox | null }) => useQueryArea(view, REGION, true),
      { initialProps: { view: null as Bbox | null } },
    );
    rerender({ view: VIEW });
    expect(result.current).toBe(REGION);
    await settle();
    expect(result.current).not.toBe(REGION);
    expect(result.current[0]).toBeLessThan(VIEW[0]);
    expect(result.current[2]).toBeGreaterThan(VIEW[2]);
  });

  it("um deslocamento pequeno mantém a mesma área e não refaz a consulta", async () => {
    const { result, rerender } = renderHook(
      ({ view }: { view: Bbox }) => useQueryArea(view, REGION, true),
      { initialProps: { view: VIEW } },
    );
    await settle();
    const first = result.current;
    rerender({ view: [-60.5, -10.5, -50.5, -0.5] });
    await settle();
    expect(result.current).toBe(first);
  });

  it("aproximar bastante pede uma área menor", async () => {
    const { result, rerender } = renderHook(
      ({ view }: { view: Bbox }) => useQueryArea(view, REGION, true),
      { initialProps: { view: VIEW } },
    );
    await settle();
    const first = result.current;
    rerender({ view: [-56, -6, -54, -4] });
    await settle();
    expect(result.current).not.toBe(first);
    expect(result.current[2] - result.current[0]).toBeLessThan(first[2] - first[0]);
  });

  it("ao trocar de região volta na hora para a região, sem esperar", async () => {
    const { result, rerender } = renderHook(
      ({ view, region }: { view: Bbox | null; region: Bbox }) =>
        useQueryArea(view, region, true),
      { initialProps: { view: VIEW as Bbox | null, region: REGION } },
    );
    await settle();
    const other: Bbox = [-20, -36, 54, 38];
    rerender({ view: null, region: other });
    expect(result.current).toBe(other);
  });
});
