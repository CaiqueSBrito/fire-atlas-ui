"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchDay, fetchMonth } from "@/lib/api/calendar";
import type { PassTime } from "@/types/calendar";

export function useMonthQuery(month: string, region: string) {
  return useQuery({
    queryKey: ["calendar", "month", month, region],
    queryFn: ({ signal }) => fetchMonth(month, region, signal),
  });
}

export function useDayQuery(
  date: string | null,
  region: string,
  passTime: PassTime,
) {
  return useQuery({
    queryKey: ["calendar", "day", date, region, passTime],
    queryFn: ({ signal }) => fetchDay(date!, region, passTime, signal),
    enabled: !!date,
    // mantém a carta anterior enquanto a nova seleção carrega (RN06/CA03)
    placeholderData: keepPreviousData,
  });
}
