// Cliente do calendário. Contrato PROPOSTO para o backend Spring Boot (ajustar
// com o time de backend):
//   GET {API}/calendar/months/{YYYY-MM}?region={id}
//   GET {API}/calendar/days/{YYYY-MM-DD}?region={id}&time=all|day|night
// Sem NEXT_PUBLIC_API_URL, usa o adaptador simulado (sinalizado na UI).

import type { DayResponse, MonthResponse, PassTime } from "@/types/calendar";
import { mockDay, mockMonth } from "./mock-calendar";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { signal });
  if (!res.ok) throw new Error(`Falha ao consultar a API (HTTP ${res.status}).`);
  return (await res.json()) as T;
}

export function fetchMonth(
  month: string,
  region: string,
  signal?: AbortSignal,
): Promise<MonthResponse> {
  if (!API_URL) return mockMonth(month, region, signal);
  return getJson(
    `/calendar/months/${month}?region=${encodeURIComponent(region)}`,
    signal,
  );
}

export function fetchDay(
  date: string,
  region: string,
  passTime: PassTime,
  signal?: AbortSignal,
): Promise<DayResponse> {
  if (!API_URL) return mockDay(date, region, passTime, signal);
  return getJson(
    `/calendar/days/${date}?region=${encodeURIComponent(region)}&time=${passTime}`,
    signal,
  );
}
