'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PickedMonth {
  year: number;
  month: number; // 0-indexed
}

interface MonthPickerProps {
  value: PickedMonth;
  onChange: (v: PickedMonth) => void;
  maxMonth?: PickedMonth; // don't allow selection beyond this
  className?: string;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function MonthPicker({ value, onChange, maxMonth, className }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(value.year);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync picker year when value changes externally
  useEffect(() => { setPickerYear(value.year); }, [value.year]);

  const isDisabled = (year: number, month: number) => {
    if (!maxMonth) return false;
    return year > maxMonth.year || (year === maxMonth.year && month > maxMonth.month);
  };

  const isSelected = (year: number, month: number) =>
    year === value.year && month === value.month;

  const label = `${MONTH_FULL[value.month]} ${value.year}`;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 h-9 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-secondary transition-colors min-w-[160px] justify-between"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span>{label}</span>
        </div>
        <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-90')} />
      </button>

      {open && (
        <div className="absolute top-11 left-0 z-50 w-64 rounded-2xl border border-border bg-card shadow-xl p-4 space-y-3">
          {/* Year navigator */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPickerYear(y => y - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <span className="text-sm font-bold text-foreground">{pickerYear}</span>
            <button
              type="button"
              onClick={() => setPickerYear(y => y + 1)}
              disabled={maxMonth && pickerYear >= maxMonth.year}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-secondary transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-1.5">
            {MONTH_NAMES.map((name, idx) => {
              const disabled = isDisabled(pickerYear, idx);
              const selected = isSelected(pickerYear, idx);
              return (
                <button
                  key={name}
                  type="button"
                  disabled={disabled}
                  onClick={() => { onChange({ year: pickerYear, month: idx }); setOpen(false); }}
                  className={cn(
                    'h-8 rounded-lg text-xs font-medium transition-all',
                    selected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : disabled
                        ? 'text-muted-foreground/30 cursor-not-allowed'
                        : 'text-foreground hover:bg-secondary'
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {/* Quick "Current month" link */}
          {maxMonth && (
            <button
              type="button"
              onClick={() => { onChange({ year: maxMonth.year, month: maxMonth.month }); setOpen(false); }}
              className="w-full text-center text-xs text-primary font-medium hover:underline pt-1"
            >
              Jump to current month
            </button>
          )}
        </div>
      )}
    </div>
  );
}
