'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/format';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface IncomeExpenseChartProps {
  income: number;
  expense: number;
  currency: string;
}

const COLORS = { expense: '#0a2929', income: '#00c853' };

export default function IncomeExpenseChart({ income, expense, currency }: IncomeExpenseChartProps) {
  const total = income + expense;
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  // Chart data — if no data at all show a neutral ring
  const data =
    total === 0
      ? [{ name: 'No data', value: 1, color: '#e0eaea' }]
      : [
          expense > 0 ? { name: 'Expense', value: expense, color: COLORS.expense } : null,
          income  > 0 ? { name: 'Income',  value: income,  color: COLORS.income  } : null,
        ].filter(Boolean) as { name: string; value: number; color: string }[];

  // Centre label logic:
  //   • No data → "–"
  //   • Only expenses (no income) → show total expenses, label "Total spent"
  //   • Income present → show net (saved or overspent), label accordingly
  let centreAmount: number;
  let centreLabel: string;
  let centreColor: string;

  if (total === 0) {
    centreAmount = 0;
    centreLabel  = 'No data';
    centreColor  = 'text-muted-foreground';
  } else if (income === 0) {
    // Only expenses — just show the total spent, no "deficit" framing
    centreAmount = expense;
    centreLabel  = 'Total spent';
    centreColor  = 'text-foreground';
  } else {
    const net = income - expense;
    centreAmount = Math.abs(net);
    centreLabel  = net >= 0 ? 'Net saved' : 'Overspent';
    centreColor  = net >= 0 ? 'text-accent-green' : 'text-destructive';
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Overview</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Income vs expenses this month</p>
        </div>
        <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-lg font-medium">
          This month
        </span>
      </div>

      <div className="flex items-center gap-5">
        {/* ── Donut with perfectly centred text ── */}
        <div className="relative shrink-0" style={{ width: 152, height: 152 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={70}
                paddingAngle={total === 0 ? 0 : 3}
                dataKey="value"
                strokeWidth={0}
                startAngle={90} endAngle={-270}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => formatCurrency(Number(v ?? 0), currency)}
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid #e0eaea',
                  fontSize: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Perfectly centred overlay — uses absolute positioning anchored to all 4 edges */}
          <div
            className="absolute pointer-events-none"
            style={{ top: 0, left: 0, right: 0, bottom: 0,
                     display: 'flex', flexDirection: 'column',
                     alignItems: 'center', justifyContent: 'center',
                     textAlign: 'center', padding: '0 12px' }}
          >
            <span
              className={`font-bold tabular-nums leading-tight ${centreColor}`}
              style={{ fontSize: centreAmount > 99999 ? 11 : centreAmount > 9999 ? 12 : 13 }}
            >
              {total === 0 ? '—' : formatCurrency(centreAmount, currency)}
            </span>
            <span className="text-muted-foreground mt-0.5" style={{ fontSize: 10 }}>
              {centreLabel}
            </span>
          </div>
        </div>

        {/* ── Stats panel ── */}
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-accent-green shrink-0" />
              <span className="text-xs text-muted-foreground">Income</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <TrendingUp className="h-3 w-3 text-accent-green" />
              <span className="text-xs font-semibold text-foreground tabular-nums">
                {formatCurrency(income, currency)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
              <span className="text-xs text-muted-foreground">Expenses</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <TrendingDown className="h-3 w-3 text-destructive" />
              <span className="text-xs font-semibold text-foreground tabular-nums">
                {formatCurrency(expense, currency)}
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-2.5">
            {income > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Savings rate</span>
                  <span className={
                    savingsRate >= 20 ? 'text-accent-green font-semibold' :
                    savingsRate >= 0  ? 'text-accent-yellow font-semibold' :
                                        'text-destructive font-semibold'
                  }>
                    {savingsRate}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={
                      savingsRate >= 20 ? 'h-full rounded-full bg-accent-green' :
                      savingsRate >= 0  ? 'h-full rounded-full bg-accent-yellow' :
                                          'h-full rounded-full bg-destructive'
                    }
                    style={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}
                  />
                </div>
              </div>
            ) : expense > 0 ? (
              <p className="text-xs text-muted-foreground">Add income to see savings rate</p>
            ) : (
              <p className="text-xs text-muted-foreground">No transactions this month yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
