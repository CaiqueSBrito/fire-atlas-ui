"use client";

import { useQueryStates } from "nuqs";
import { filterParsers } from "@/lib/filters";

export function useFilters() {
  return useQueryStates(filterParsers, { history: "replace" });
}
