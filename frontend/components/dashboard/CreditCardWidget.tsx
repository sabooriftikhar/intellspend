'use client';

import { useState } from 'react';
import { CalendarClock, CreditCard, ArrowLeftRight, Loader2, X, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { AccountWithBalance } from '@/lib/types';
import { formatCurrency, getDaysUntilDue } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useBook } from '@/contexts/BookContext';

interface CreditCardWidgetProps {
  account: AccountWithBalance;
  allAccounts?: AccountWithBalance[];
  onRefresh?: () => void;
}

// ── Pay-card modal (transfer style) ──────────────────────────
interface PayCardModalProps {
  account: AccountWithBalance;
  allAccounts: AccountWithBalance[];
  onDone: () => void;
  onCancel: () => void;
}

function PayCardModal({ account, allAccounts, onDone, onCancel }: PayCardModalProps) {
  const { activeBook, books } = useBook();
  const balanceOwed = account.balance < 0 ? Math.abs(account.balance) : 0;

  // Source accounts — everything except this credit card
  const sourceAccounts = allAccounts.filter((a) => a.id !== account.id);

  const [fromAccountId, setFromAccountId] = useState(
    String(sourceAccounts[0]?.id ?? '')
  );
  const [amount, setAmount] = useState(balanceOwed.toFixed(2));
  const [description, setDescription] = useState(`${account.name} payment`);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const bookId = activeBook?.id ?? books[0]?.id;
  const fromAccount = allAccounts.find((a) => a.id === Number(fromAccountId));

  const handlePay = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!fromAccountId) { setError('Select a source account'); return; }
    if (!bookId) { setError('No book selected'); return; }
    setPaying(true);
    setError('');
    try {
      await api.post('/transactions/', {
        book_id: bookId,
        account_id: Number(fromAccountId),
        kind: 'transfer',
        amount: amt,
        currency: fromAccount?.currency ?? account.currency,
        description: description || `${account.name} payment`,
        occurred_on: date,
        category_id: null,
        transfer_to_account_id: account.id,
      });
      onDone();
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
      <div className="relative w-full max-w-sm rounded-2xl bg-card border border-border shadow-xl overflow-hidden z-10">

        {/* Header — amber tint matching transfer colour */}
        <div className="bg-accent-yellow/10 px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <ArrowLeftRight className="h-4 w-4 text-amber-700" />
                <p className="font-semibold text-foreground">Pay credit card</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {account.name} · Balance owed: {formatCurrency(balanceOwed, account.currency)}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground pointer-events-none">
                {(fromAccount?.currency ?? account.currency).slice(0, 1)}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 h-12 rounded-xl border border-border bg-background text-foreground text-xl font-bold focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          {/* From account + Date side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">From account</label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                <option value="">Select account</option>
                {sourceAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          {/* Transfer to — locked to this card */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">To (credit card)</label>
            <div className="flex items-center gap-2 h-10 rounded-xl border border-border bg-secondary/40 px-3">
              <CreditCard className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">{account.name}</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/8 rounded-xl px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePay}
              disabled={paying || !fromAccountId}
              className="flex-1 h-10 rounded-xl bg-accent-yellow text-amber-900 text-sm font-semibold hover:bg-accent-yellow/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {paying
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                : <><ArrowLeftRight className="h-4 w-4" /> Record Payment</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────
export default function CreditCardWidget({ account, allAccounts = [], onRefresh }: CreditCardWidgetProps) {
  const [showPayModal, setShowPayModal] = useState(false);

  const balanceOwed = account.balance < 0 ? Math.abs(account.balance) : 0;
  const creditLimit = account.credit_limit ?? 0;
  const availableCredit = creditLimit > 0 ? creditLimit - balanceOwed : null;
  const daysUntilDue = getDaysUntilDue(account.due_day);
  const usagePercent = creditLimit > 0 ? Math.min((balanceOwed / creditLimit) * 100, 100) : 0;
  const cardStub = String(account.id).padStart(4, '0').slice(-4);

  return (
    <>
      <div className="space-y-3">
        {/* Visual card */}
        <div className="relative overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground min-h-[168px] flex flex-col justify-between shadow-lg">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/[0.04]" />
          <div className="absolute -right-4 bottom-[-2.5rem] h-48 w-48 rounded-full bg-white/[0.04]" />

          <div className="flex items-start justify-between relative">
            <CreditCard className="h-6 w-6 opacity-70" />
            <span className="text-xs font-bold tracking-[0.2em] opacity-70 uppercase">VISA</span>
          </div>

          <div className="relative">
            <p className="text-sm font-mono tracking-[0.18em] opacity-60 mb-2">**** **** **** {cardStub}</p>
          </div>

          <div className="flex items-end justify-between relative">
            <div>
              <p className="text-[10px] opacity-50 mb-0.5 uppercase tracking-wider">Balance owed</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(balanceOwed, account.currency)}</p>
            </div>
            {account.due_day && (
              <div className="text-right">
                <p className="text-[10px] opacity-50 mb-0.5 uppercase tracking-wider">Due</p>
                <p className="text-sm font-semibold">{account.due_day}th</p>
              </div>
            )}
          </div>

          <div className="relative flex items-center justify-between mt-1">
            <p className="text-xs font-medium opacity-70 truncate pr-4">{account.name}</p>
            <div className="flex -space-x-1.5 shrink-0">
              <div className="h-5 w-5 rounded-full bg-white/25" />
              <div className="h-5 w-5 rounded-full bg-white/15" />
            </div>
          </div>
        </div>

        {/* Credit usage */}
        {creditLimit > 0 && (
          <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Credit utilisation</span>
              <span className={cn('font-semibold',
                usagePercent > 80 ? 'text-destructive' : usagePercent > 50 ? 'text-accent-yellow' : 'text-accent-green')}>
                {usagePercent.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-500',
                usagePercent > 80 ? 'bg-destructive' : usagePercent > 50 ? 'bg-accent-yellow' : 'bg-accent-green')}
                style={{ width: `${usagePercent}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Used: {formatCurrency(balanceOwed, account.currency)}</span>
              {availableCredit !== null && (
                <span className="text-accent-green font-medium">{formatCurrency(availableCredit, account.currency)} free</span>
              )}
            </div>
          </div>
        )}

        {/* Days until due */}
        {daysUntilDue !== null && (
          <div className={cn('flex items-center gap-3 rounded-2xl px-4 py-3 border',
            daysUntilDue <= 3 ? 'bg-destructive/8 border-destructive/20' : 'bg-accent border-border')}>
            <CalendarClock className={cn('h-4 w-4 shrink-0', daysUntilDue <= 3 ? 'text-destructive' : 'text-primary')} />
            <span className="text-sm flex-1">
              {daysUntilDue === 0 ? <span className="font-semibold text-destructive">Payment due today</span>
                : daysUntilDue <= 3 ? <span className="font-semibold text-destructive">Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}</span>
                : <span className="text-foreground font-medium">{daysUntilDue} days until due</span>}
            </span>
          </div>
        )}

        {/* Pay button — only shown when there's a balance owed */}
        {balanceOwed > 0 && (
          <button
            onClick={() => setShowPayModal(true)}
            className="w-full h-10 rounded-xl bg-accent-green text-white text-sm font-semibold hover:bg-accent-green/90 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Pay {formatCurrency(balanceOwed, account.currency)}
          </button>
        )}
      </div>

      {showPayModal && (
        <PayCardModal
          account={account}
          allAccounts={allAccounts}
          onDone={() => { setShowPayModal(false); onRefresh?.(); }}
          onCancel={() => setShowPayModal(false)}
        />
      )}
    </>
  );
}
