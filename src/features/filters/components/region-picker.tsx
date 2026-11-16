"use client";

import { useRef, useState, type ReactNode } from "react";
import { CONTINENT_IDS, REGIONS } from "@/config/regions";
import { useDismiss } from "@/hooks/use-dismiss";
import { cn } from "@/lib/utils/cn";

const OPTIONS = REGIONS.filter((r) => r.id === "world" || CONTINENT_IDS.includes(r.id));

type RegionPickerProps = {
  /** Região ativa; `null` quando a área é personalizada. */
  value: string | null;
  label: ReactNode;
  onSelect: (id: string) => void;
};

export function RegionPicker({ value, label, onSelect }: RegionPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useDismiss(open, ref, close);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title="Choose continent"
        className="-mx-2 inline-flex items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-space-800"
      >
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose continent"
          className="pop-in absolute left-0 top-full z-30 mt-3 w-56 rounded-2xl border border-space-600 bg-space-900 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.6)]"
        >
          <div role="radiogroup" aria-label="Continent" className="flex flex-col gap-1">
            {OPTIONS.map((r) => {
              const selected = r.id === value;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  autoFocus={selected}
                  onClick={() => {
                    onSelect(r.id);
                    close();
                  }}
                  className={cn(
                    "h-10 rounded-xl px-3 text-left text-small font-medium transition",
                    selected ? "bg-ember-400 font-bold text-space-950" : "text-ink-100 hover:bg-space-800",
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
