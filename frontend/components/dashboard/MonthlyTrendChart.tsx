'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/format';
import { MonthStat } from '@/hooks/useDashboardData';

interface MonthlyTrendChartProps {
  data: MonthStat[];
  currency: string;
}

const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card shadow-lg px-4 py-3 text-xs space-y-1.5">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground capitalize">{p.name}</span>
          </div>
          <span className="font-semibold text-foreground tabular-nums">
            {formatCurrency(p.value, currency)}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-6 border-t border-border pt-1.5 mt-1">
        <span className="text-muted-foreground">Net</span>
        <span className={`font-semibold tabular-nums ${
          (payload[0]?.value ?? 0) - (payload[1]?.value ?? 0) >= 0
            ? 'text-accent-green' : 'text-destructive'
        }`}>
          {formatCurrency((payload[0]?.value ?? 0) - (payload[1]?.value ?? 0), currency)}
        </span>
      </div>
    </div>
  );
};

export default function MonthlyTrendChart({ data, currency }: MonthlyTrendChartProps) {
  const hasData = data.some(d => d.income > 0 || d.expense > 0);

  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Monthly Trend</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Income vs expenses over 6 months</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent-green" />
            <span className="text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="text-muted-foreground">Expenses</span>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
          No transaction data yet
        </div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00c853" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#00c853" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0a2929" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#0a2929" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0eaea" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#6b8080' }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b8080' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                width={36}
              />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Area
                type="monotone" dataKey="income" name="Income"
                stroke="#00c853" strokeWidth={2}
                fill="url(#incomeGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone" dataKey="expense" name="Expenses"
                stroke="#0a2929" strokeWidth={2}
                fill="url(#expenseGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
