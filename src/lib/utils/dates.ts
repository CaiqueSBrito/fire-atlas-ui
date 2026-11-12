// Utilitários de data em UTC. Datas "YYYY-MM-DD", meses "YYYY-MM".

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isValidDate(value: string | null | undefined): value is string {
  if (!value) return false;
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isValidMonth(value: string | null | undefined): value is string {
  if (!value) return false;
  const m = ISO_MONTH.exec(value);
  return !!m && Number(m[2]) >= 1 && Number(m[2]) <= 12;
}

export const monthOf = (date: string) => date.slice(0, 7);

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** 0 = domingo … 6 = sábado, do dia 1 do mês. */
export function firstWeekday(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
}

export function shiftDate(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export const dayNumber = (date: string) => date.slice(8, 10);

const longFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthFmt = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export const formatLong = (date: string) =>
  longFmt.format(new Date(`${date}T00:00:00Z`));

export function formatMonthTitle(month: string): string {
  const text = monthFmt.format(new Date(`${month}-01T00:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const monthShortFmt = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: "UTC",
});

/** Nome curto do mês (0 = janeiro), ex.: "jan", "fev". */
export function monthShortName(index: number): string {
  return monthShortFmt
    .format(new Date(Date.UTC(2000, index, 1)))
    .replace(".", "");
}

/** Intervalo de anos oferecidos nos seletores (a API informa o que existe). */
export const MIN_YEAR = 2000;
export const maxYear = () => Number(todayUtc().slice(0, 4)) + 1;

export function formatShort(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}
