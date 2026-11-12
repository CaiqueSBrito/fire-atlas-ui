"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { fetchFireSummary } from "@/lib/api/fires";
import { useFilters } from "./use-filters";

const MOCK_MODES = ["error", "empty"] as const;

export function useFireSummary() {
  const [filters] = useFilters();
  // Simulação de estados só fora de produção.
  const [mockParam] = useQueryState("mock", parseAsStringLiteral(MOCK_MODES));
  const mock = process.env.NODE_ENV === "production" ? null : mockParam;

  return useQuery({
    queryKey: ["fire-summary", filters, mock],
    queryFn: ({ signal }) => fetchFireSummary(filters, mock, signal),
  });
}
