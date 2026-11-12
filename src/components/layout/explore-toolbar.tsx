"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
// Exceção à regra "features não importam features": esta barra existe para
// compor filtros + calendário no shell.
import { FilterBar } from "@/features/filters/components/filter-bar";
import { CalendarPanel } from "@/features/calendar/components/calendar-panel";

export function ExploreToolbar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-space-600 bg-space-900">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <FilterBar>
          <Button
            variant="secondary"
            aria-expanded={open}
            aria-controls="calendar-panel"
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden>📅</span>
            Calendário
            <span aria-hidden>{open ? "▲" : "▼"}</span>
          </Button>
        </FilterBar>
      </div>
      <div
        id="calendar-panel"
        hidden={!open}
        className="border-t border-space-600"
      >
        <CalendarPanel />
      </div>
    </div>
  );
}
