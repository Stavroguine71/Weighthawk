// Date helpers — we store dates at midnight UTC for date-only fields.

export function startOfDayUTC(input: Date | string): Date {
  const d = typeof input === 'string' ? new Date(input) : new Date(input);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function parseDateInput(s: string | undefined | null): Date {
  if (!s) return startOfDayUTC(new Date());
  // Accept "YYYY-MM-DD" — treat as that calendar date at UTC midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T00:00:00.000Z`);
  }
  return startOfDayUTC(new Date(s));
}

export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
