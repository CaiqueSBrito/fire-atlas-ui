import { describe, expect, it } from "vitest";
import { bootstrapProgress, type AnnualLoadingState } from "./bootstrap";

const importing: AnnualLoadingState = {
  state: "loading",
  phase: "importing",
  completedUnits: 2,
  totalUnits: 4,
  rowsLoaded: 200,
  message: "Importing",
  error: null,
  finalizationCompleted: 0,
  finalizationTotal: 1,
};

describe("bootstrapProgress", () => {
  it("conta commits de arquivos e finalizacao sem antecipar o commit de publicacao", () => {
    expect(bootstrapProgress(importing)).toBe(33);
    const filesCommitted = { ...importing, completedUnits: 4 };
    expect(bootstrapProgress(filesCommitted)).toBe(66);
    const finalized = { ...filesCommitted, finalizationCompleted: 1, phase: "analyzing" as const };
    expect(bootstrapProgress(finalized)).toBe(83);
    expect(bootstrapProgress({ ...finalized, state: "ready", phase: "ready" })).toBe(100);
  });

  it("linhas ainda nao confirmadas e mensagens de transferencia nao avancam a barra", () => {
    const preparing = { ...importing, state: "idle" as const, completedUnits: 0, totalUnits: 0, finalizationTotal: 0 };
    expect(bootstrapProgress(preparing)).toBe(0);
    expect(bootstrapProgress({ ...importing, message: "4000000 linhas enviadas; aguardando commit" }))
      .toBe(bootstrapProgress(importing));
  });
});
