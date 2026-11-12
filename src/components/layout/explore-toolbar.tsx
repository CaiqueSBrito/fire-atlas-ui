"use client";

import { usePathname } from "next/navigation";
import { FilterBar } from "@/features/filters/components/filter-bar";

export function ExploreToolbar() {
  const pathname = usePathname();
  if (pathname.startsWith("/explore/calendar")) return null;

  return (
    <div className="border-b border-space-600 bg-space-900">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <FilterBar />
      </div>
    </div>
  );
}
