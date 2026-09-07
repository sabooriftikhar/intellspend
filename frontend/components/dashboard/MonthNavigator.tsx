'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMonthRangeFor } from '@/lib/format';
import { cn } from '@/lib/utils';
import { isCurrentMonth, offsetMonth, SelectedMonth } from '@/lib/transactions';

interface MonthNavigatorProps {
  selectedMonth: SelectedMonth;
  onChange: (month: SelectedMonth) => void;
  className?: string;
}

export default function MonthNavigator({ selectedMonth, onChange, className }: MonthNavigatorProps) {
  const { label } = getMonthRangeFor(selectedMonth.year, selectedMonth.month);
  const current = isCurrentMonth(selectedMonth);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={() => onChange(offsetMonth(selectedMonth, -1))}
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card hover:bg-secondary transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex-1 text-center rounded-xl border border-border bg-card px-4 py-1.5 min-w-[160px]">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {current && (
          <p className="text-[10px] text-accent-green font-medium">Current month</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(offsetMonth(selectedMonth, 1))}
        disabled={current}
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}
