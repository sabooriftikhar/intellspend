'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '@/lib/format';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface IncomeExpenseChartProps {
  income: number;
  expense: number;
  currency: string;
}

// Colors matching the design image (dark teal, green, yellow)
const CHART_COLORS = {
  available: '#0a2929',
  planned: '#00c853',
  other: '#ffca28',
};

export default function IncomeExpenseChart({
  income,
  expense,
  currency,
}: IncomeExpenseChartProps) {
  const total = income + expense;
  const netFlow = income - expense;
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  const data =
    total === 0
      ? [{ name: 'No data', value: 1, color: '#e0eaea' }]
      : [
          { name: 'Expense', value: expense, color: CHART_COLORS.available },
          { name: 'Income', value: income, color: CHART_COLORS.planned },
        ].filter((d) => d.value > 0);

  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Overview</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Income vs expenses this month</p>
        </div>
        <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-lg font-medium">
          This month
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Donut chart */}
        <div className="relative w-[160px] h-[160px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={72}
                paddingAngle={total === 0 ? 0 : 3}
                dataKey="value"
                strokeWidth={0}
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(Number(value ?? 0), currency)}
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid #e0eaea',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-lg font-bold text-foreground tabular-nums leading-tight">
              {formatCurrency(Math.abs(netFlow), currency)}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">
              {netFlow >= 0 ? 'Net saved' : 'Net deficit'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Income */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-2.5 w-2.5 rounded-full bg-accent-green shrink-0" />
              <span className="text-xs text-muted-foreground truncate">Income</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <TrendingUp className="h-3 w-3 text-accent-green" />
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {formatCurrency(income, currency)}
              </span>
            </div>
          </div>

          {/* Expense */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
              <span className="text-xs text-muted-foreground truncate">Expenses</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <TrendingDown className="h-3 w-3 text-destructive" />
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {formatCurrency(expense, currency)}
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            {income > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Savings rate</span>
                  <span
                    className={
                      savingsRate >= 20
                        ? 'text-accent-green font-semibold'
                        : savingsRate >= 0
                          ? 'text-accent-yellow font-semibold'
                          : 'text-destructive font-semibold'
                    }
                  >
                    {savingsRate}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={
                      savingsRate >= 20
                        ? 'h-full rounded-full bg-accent-green'
                        : savingsRate >= 0
                          ? 'h-full rounded-full bg-accent-yellow'
                          : 'h-full rounded-full bg-destructive'
                    }
                    style={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No income recorded yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
