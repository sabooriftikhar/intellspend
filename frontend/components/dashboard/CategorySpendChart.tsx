'use client';

import { useMemo } from 'react';
import { Transaction, Category } from '@/lib/types';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface CategorySpendChartProps {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
}

const BAR_COLORS = [
  '#0a2929', '#1a4444', '#00897b', '#00c853',
  '#4a9e9e', '#ffca28', '#ff7043', '#ab47bc',
];

export default function CategorySpendChart({
  transactions, categories, currency,
}: CategorySpendChartProps) {
  const catMap = useMemo(
    () => new Map(categories.map(c => [c.id, c])),
    [categories]
  );

  const data = useMemo(() => {
    const totals: Record<string, { name: string; icon: string; amount: number }> = {};
    for (const tx of transactions) {
      if (tx.kind !== 'expense') continue;
      const cat = tx.category_id ? catMap.get(tx.category_id) : null;
      const key = cat ? String(cat.id) : '__none__';
      const name = cat?.name ?? 'Uncategorised';
      const icon = cat?.icon ?? '🏷️';
      if (!totals[key]) totals[key] = { name, icon, amount: 0 };
      totals[key].amount += tx.amount;
    }
    return Object.values(totals)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 7);
  }, [transactions, catMap]);

  const maxAmount = data[0]?.amount ?? 1;
  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Spending by Category</h3>
          <p className="text-xs text-muted-foreground mt-0.5">This month's top expenses</p>
        </div>
        {total > 0 && (
          <span className="text-xs font-semibold text-foreground tabular-nums bg-secondary px-2.5 py-1 rounded-lg">
            {formatCurrency(total, currency)}
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          No expense categories yet
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item, i) => {
            const pct = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
            const totalPct = total > 0 ? Math.round((item.amount / total) * 100) : 0;
            return (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">{item.icon}</span>
                    <span className="text-xs font-medium text-foreground truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground">{totalPct}%</span>
                    <span className="text-xs font-semibold text-foreground tabular-nums">
                      {formatCurrency(item.amount, currency)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
