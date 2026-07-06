'use client';

import { useState } from 'react';
import {
  AlertCircle, CheckCircle2, Clock, Zap, ChevronRight, Loader2, CreditCard,
} from 'lucide-react';
import api from '@/lib/api';
import { Bill, Account } from '@/lib/types';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface PayModalProps {
  bill: Bill;
  accounts: Account[];
  onPaid: () => void;
  onCancel: () => void;
}

function PayModal({ bill, accounts, onPaid, onCancel }: PayModalProps) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ? String(accounts[0].id) : '');
  const [amount, setAmount] = useState(String(bill.estimated_amount));
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const selectedAcc = accounts.find((a) => a.id === Number(accountId));

  const handlePay = async () => {
    if (!accountId) return;
    setPaying(true);
    setError('');
    try {
      await api.post(`/bills/${bill.id}/pay`, {
        account_id: Number(accountId),
        amount: parseFloat(amount) || bill.estimated_amount,
        description: `${bill.name} payment`,
        paid_on: new Date().toISOString().slice(0, 10),
      });
      onPaid();
    } catch (err: unknown) {
      const detail = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;
      setError(typeof detail === 'string' ? detail : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-card border border-border shadow-xl p-6 space-y-4 z-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-4 w-4 text-primary" />
            <p className="font-semibold text-foreground">Pay bill</p>
          </div>
          <p className="text-sm text-muted-foreground">{bill.name}</p>
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium pointer-events-none">
              {selectedAcc?.currency?.slice(0, 1) ?? '$'}
            </span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-7 h-11 rounded-xl border border-border bg-background text-foreground text-lg font-bold focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        {/* Account selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Pay from account</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          >
            <option value="">Select account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/8 rounded-xl px-3 py-2">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePay}
            disabled={paying || !accountId}
            className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {paying ? 'Processing…' : 'Mark as Paid'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Urgency helper ─────────────────────────────────────────────
function getDaysUntil(dueDateStr?: string | null, dueDay?: number): number | null {
  if (dueDateStr) {
    const due = new Date(dueDateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - today.getTime()) / 86400000);
  }
  if (dueDay) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let due = new Date(today.getFullYear(), today.getMonth(), dueDay);
    if (due < today) due = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
    return Math.round((due.getTime() - today.getTime()) / 86400000);
  }
  return null;
}

function urgencyConfig(days: number | null) {
  if (days === null) return { color: 'text-muted-foreground', bg: 'bg-secondary', icon: Clock, label: '' };
  if (days < 0) return { color: 'text-destructive', bg: 'bg-destructive/8', icon: AlertCircle, label: `${Math.abs(days)}d overdue` };
  if (days === 0) return { color: 'text-destructive', bg: 'bg-destructive/8', icon: Zap, label: 'Due today' };
  if (days <= 3) return { color: 'text-destructive', bg: 'bg-destructive/8', icon: AlertCircle, label: `${days}d left` };
  if (days <= 7) return { color: 'text-amber-700', bg: 'bg-accent-yellow/15', icon: Clock, label: `${days}d left` };
  return { color: 'text-muted-foreground', bg: 'bg-secondary', icon: Clock, label: `${days}d left` };
}

// ── Main widget ────────────────────────────────────────────────
interface UpcomingBillsProps {
  bills: Bill[];
  accounts: Account[];
  onRefresh: () => void;
  showAll?: boolean;
}

export default function UpcomingBills({ bills, accounts, onRefresh, showAll = false }: UpcomingBillsProps) {
  const [payingBill, setPayingBill] = useState<Bill | null>(null);

  const pending = bills
    .filter((b) => b.status === 'pending')
    .map((b) => ({ ...b, _days: getDaysUntil(b.due_date, b.due_day_of_month) }))
    .sort((a, b) => {
      const da = a._days ?? 999;
      const db2 = b._days ?? 999;
      return da - db2;
    });

  const display = showAll ? pending : pending.slice(0, 5);

  if (pending.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Upcoming Bills</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Reminders & due dates</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <CheckCircle2 className="h-8 w-8 text-accent-green" />
          <p className="text-sm font-medium text-foreground">All caught up!</p>
          <p className="text-xs text-muted-foreground">No pending bills.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Upcoming Bills</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pending.length} pending bill{pending.length !== 1 ? 's' : ''}
            </p>
          </div>
          <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
            {pending.filter((b) => (b._days ?? 99) <= 3).length > 0
              ? `${pending.filter((b) => (b._days ?? 99) <= 3).length} urgent`
              : `${pending.length} pending`}
          </span>
        </div>

        <div className="divide-y divide-border">
          {display.map((bill) => {
            const cfg = urgencyConfig(bill._days);
            const Icon = cfg.icon;

            return (
              <div
                key={bill.id}
                className={cn('flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/30', cfg.bg !== 'bg-secondary' && cfg.bg)}
              >
                {/* Urgency icon */}
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl shrink-0', cfg.bg)}>
                  <Icon className={cn('h-4 w-4', cfg.color)} />
                </div>

                {/* Name & meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{bill.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {bill.bill_month && (
                      <span className="text-[11px] text-muted-foreground">{bill.bill_month}</span>
                    )}
                    <span className={cn('text-[11px] font-semibold', cfg.color)}>
                      {cfg.label || `Due ${bill.due_day_of_month}th`}
                    </span>
                    <span className="text-[11px] text-muted-foreground capitalize">{bill.recurrence}</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground tabular-nums">
                    {formatCurrency(bill.estimated_amount, 'USD')}
                  </p>
                </div>

                {/* Pay button */}
                <button
                  onClick={() => setPayingBill(bill)}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Pay
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>

        {!showAll && pending.length > 5 && (
          <div className="px-5 py-3 border-t border-border text-center">
            <a href="/bills" className="text-xs text-primary font-medium hover:underline">
              View all {pending.length} bills →
            </a>
          </div>
        )}
      </div>

      {payingBill && (
        <PayModal
          bill={payingBill}
          accounts={accounts}
          onPaid={() => { setPayingBill(null); onRefresh(); }}
          onCancel={() => setPayingBill(null)}
        />
      )}
    </>
  );
}
