/**
 * Calendar date keys in local timezone as YYYY-MM-DD.
 * Use for care schedules, event dates, and comparisons — not for UTC instants.
 */

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Interprets a YYYY-MM-DD key in the user's local calendar at local noon
 * to avoid UTC boundary shifts when formatting or doing calendar math.
 */
export function parseLocalDateKey(dateKey: string): Date {
  const trimmed = dateKey.trim();
  const m = DATE_KEY_RE.exec(trimmed);
  if (!m) return new Date(NaN);
  const y = Number(m[1]);
  const mon = Number(m[2]) - 1;
  const day = Number(m[3]);
  return new Date(y, mon, day, 12, 0, 0, 0);
}

export function formatLocalDateKey(
  dateKey: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
  locale?: string,
): string {
  const d = parseLocalDateKey(dateKey);
  if (Number.isNaN(d.getTime())) return dateKey;
  return new Intl.DateTimeFormat(locale, options).format(d);
}

export function addDaysLocal(dateKey: string, days: number): string {
  const d = parseLocalDateKey(dateKey);
  if (Number.isNaN(d.getTime())) return dateKey;
  d.setDate(d.getDate() + days);
  return getLocalDateKey(d);
}

export function subtractDaysLocal(dateKey: string, days: number): string {
  return addDaysLocal(dateKey, -days);
}
