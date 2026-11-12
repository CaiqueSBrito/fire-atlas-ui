"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { validateBbox } from "@/lib/utils/bbox";
import type { Bbox } from "@/types/detections";

const FIELDS = [
  { key: 0, label: "Oeste (lon)", hint: "−180 a 180" },
  { key: 1, label: "Sul (lat)", hint: "−90 a 90" },
  { key: 2, label: "Leste (lon)", hint: "−180 a 180" },
  { key: 3, label: "Norte (lat)", hint: "−90 a 90" },
] as const;

const input =
  "min-h-11 w-full rounded-lg border border-space-600 bg-space-800 px-3 font-mono text-small text-ink-100";

export function AreaPanel({
  bbox,
  customArea,
  drawing,
  onToggleDraw,
  onApply,
  onClear,
}: {
  bbox: Bbox;
  customArea: boolean;
  drawing: boolean;
  onToggleDraw: () => void;
  onApply: (bbox: Bbox) => void;
  onClear: () => void;
}) {
  const [values, setValues] = useState(bbox.map(String));
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = values.map((v) => Number(v.replace(",", ".")));
    if (parsed.some((n) => !Number.isFinite(n) || values.some((v) => v.trim() === ""))) {
      setError("Preencha os quatro limites com números.");
      return;
    }
    const next = parsed as Bbox;
    const problem = validateBbox(next);
    setError(problem);
    if (!problem) onApply(next);
  }

  return (
    <section aria-labelledby="area-title" className="flex flex-col gap-3">
      <h2 id="area-title" className="text-caption uppercase tracking-wider text-ink-300">
        Área de interesse
      </h2>
      <Button
        variant={drawing ? "primary" : "secondary"}
        aria-pressed={drawing}
        onClick={onToggleDraw}
      >
        {drawing ? "Arraste no mapa… (cancelar)" : "Desenhar área no mapa"}
      </Button>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          {FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-caption text-ink-300">
              {f.label}
              <input
                inputMode="decimal"
                value={values[f.key]}
                onChange={(e) =>
                  setValues((v) => v.map((x, i) => (i === f.key ? e.target.value : x)))
                }
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "area-error" : undefined}
                placeholder={f.hint}
                className={input}
              />
            </label>
          ))}
        </div>
        {error && (
          <p id="area-error" role="alert" className="text-small text-fire-400">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="secondary">
            Aplicar coordenadas
          </Button>
          {customArea && (
            <Button variant="ghost" onClick={onClear}>
              Remover área
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
