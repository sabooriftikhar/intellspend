export function formatCurrency(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getDaysUntilDue(dueDay: number | null | undefined): number | null {
  if (!dueDay) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let due = new Date(today.getFullYear(), today.getMonth(), dueDay);
  if (due < today) {
    due = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
  }
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const { start, end } = getMonthRangeFor(now.getFullYear(), now.getMonth());
  return { start, end };
}

/** Build a date range for any (year, month) — month is 0-indexed.
 *  Uses local-date arithmetic (no UTC conversion) to avoid timezone bugs.
 */
export function getMonthRangeFor(year: number, month: number): { start: string; end: string; label: string } {
  // Build YYYY-MM-DD strings directly from numbers — no Date.toISOString() to avoid UTC shift
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${year}-${pad(month + 1)}-01`;

  // Last day: first day of next month minus 1
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear  = month === 11 ? year + 1 : year;
  // Get actual last day by constructing the last day directly
  const lastDay = new Date(nextYear, nextMonth, 0).getDate(); // getDate() of day-0 = last day of prev month
  const end = `${year}-${pad(month + 1)}-${pad(lastDay)}`;

  const label = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  return { start, end, label };
}

/** Returns last N months as { year, month (0-indexed), label } newest first. */
export function getLastNMonths(n: number) {
  const result = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      year:  d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
      short: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
    });
  }
  return result;
}

export function groupLabelForDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const compare = new Date(date);
  compare.setHours(0, 0, 0, 0);

  if (compare.getTime() === today.getTime()) return 'Today';
  if (compare.getTime() === yesterday.getTime()) return 'Yesterday';
  return formatDate(dateStr);
}
