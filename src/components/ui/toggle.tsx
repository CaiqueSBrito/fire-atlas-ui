"use client";

import { useId } from "react";

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-space-600 p-3">
      <span className="flex flex-col">
        <span id={`${id}-label`} className="text-small font-semibold">
          {label}
        </span>
        {description && (
          <span id={`${id}-desc`} className="text-caption text-ink-300">
            {description}
          </span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) ${
          checked ? "border-ember-400 bg-ember-400" : "border-space-600 bg-space-700"
        }`}
      >
        <span
          aria-hidden
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
