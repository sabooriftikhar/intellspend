export interface TransactionSummary {
  income: number;
  expense: number;
  net: number;
  count: number;
}

export interface SelectedMonth {
  year: number;
  month: number; // 0-indexed
}

export const PAGE_SIZE = 50;

export function offsetMonth(base: SelectedMonth, offset: number): SelectedMonth {
  const d = new Date(base.year, base.month + offset, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function isCurrentMonth(sel: SelectedMonth): boolean {
  const now = new Date();
  return sel.year === now.getFullYear() && sel.month === now.getMonth();
}

export function dayBefore(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
