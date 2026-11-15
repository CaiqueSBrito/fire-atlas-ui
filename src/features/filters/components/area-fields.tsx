"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { formatBboxParam, parseBbox, validateBbox } from "@/lib/utils/bbox";
import type { Bbox } from "@/types/detections";

const FIELDS = [
  { key: 0, label: "Oeste (lon)", hint: "−180 a 180" },
  { key: 1, label: "Sul (lat)", hint: "−90 a 90" },
  { key: 2, label: "Leste (lon)", hint: "−180 a 180" },
  { key: 3, label: "Norte (lat)", hint: "−90 a 90" },
] as const;

export function AreaFields({
  bbox,
  fallback,
  onChange,
}: {
  bbox: string | null;
  fallback: Bbox;
  onChange: (bbox: string | null) => void;
}) {
  const start = parseBbox(bbox) ?? fallback;
  const [values, setValues] = useState(start.map(String));
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = values.map((v) => Number(v.replace(",", ".")));
    if (parsed.some((n, i) => !Number.isFinite(n) || values[i].trim() === "")) {
      setError("Preencha os quatro limites com números.");
      return;
    }
    const problem = validateBbox(parsed as Bbox);
    setError(problem);
    if (!problem) onChange(formatBboxParam(parsed as Bbox));
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <label
            key={f.key}
            className="flex flex-col gap-2 text-small font-semibold tracking-[-0.02em] text-ink-300"
          >
            <span>
              {f.label} <span className="font-normal text-ink-300/70">({f.hint})</span>
            </span>
            <input
              inputMode="decimal"
              value={values[f.key]}
              onChange={(e) =>
                setValues((v) => v.map((x, i) => (i === f.key ? e.target.value : x)))
              }
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "area-error" : undefined}
              placeholder="0"
              className={`${fieldClass} w-full font-mono`}
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
        <Button type="submit" variant="accent">
          Usar esta área
        </Button>
      </div>
    </form>
  );
}
