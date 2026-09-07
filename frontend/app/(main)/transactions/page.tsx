'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Loader2, RefreshCw, ChevronLeft, ChevronRight, ChevronLeft as PgPrev, ChevronRight as PgNext } from 'lucide-react';
import api from '@/lib/api';
import { Transaction, Account, Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import TransactionTable from '@/components/dashboard/TransactionTable';
import AddTransactionModal from '@/components/dashboard/AddTransactionModal';
import { useBook } from '@/contexts/BookContext';
import { cn } from '@/lib/utils';
import { formatCurrency, getMonthRangeFor, getLastNMonths } from '@/lib/format';

interface AccountBalance { balance: number; currency: string; }
interface AccountWithBalance extends Account { balance: number; }

const PAGE_SIZE = 50;

export default function TransactionsPage() {
  const { activeBook } = useBook();

  // ── Month selector ──────────────────────────────────────────
  const now = new Date();
  const months = getLastNMonths(12); // last 12 months, newest first
  const [selMonthIdx, setSelMonthIdx] = useState(0); // 0 = current month
  const selectedMonth = months[selMonthIdx];
  const { start: mStart, end: mEnd, label: monthLabel } = getMonthRangeFor(
    selectedMonth.year,
    selectedMonth.month
  );
  const isCurrentMonth = selMonthIdx === 0;

  // ── Pagination ──────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // ── Data ───────────────────────────────────────────────────
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [accounts,        setAccounts]        = useState<AccountWithBalance[]>([]);
  const [categories,      setCategories]      = useState<Category[]>([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [isRefreshing,    setIsRefreshing]    = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [modalOpen,       setModalOpen]       = useState(false);
  const [editTarget,      setEditTarget]      = useState<Transaction | null>(null);

  const openCreate = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit   = (tx: Transaction) => { setEditTarget(tx); setModalOpen(true); };

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const params = activeBook ? { book_id: activeBook.id } : {};
      const [txRes, accRes, catRes] = await Promise.all([
        api.get<Transaction[]>('/transactions/', { params: { ...params, limit: 2000 } }),
        api.get<Account[]>('/accounts/', { params }),
        api.get<Category[]>('/categories/', { params }),
      ]);
      const withBal: AccountWithBalance[] = await Promise.all(
        accRes.data.map(async a => {
          try {
            const r = await api.get<AccountBalance>(`/accounts/${a.id}/balance`);
            return { ...a, balance: r.data.balance };
          } catch { return { ...a, balance: a.opening_balance }; }
        })
      );
      setAllTransactions(txRes.data);
      setAccounts(withBal);
      setCategories(catRes.data);
    } catch {
      setError('Unable to refresh transactions. Showing last snapshot.');
    }
  }, [activeBook]);

  const load = useCallback(async () => {
    setIsLoading(true);
    await fetchAll();
    setIsLoading(false);
  }, [fetchAll]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAll();
    setIsRefreshing(false);
  }, [fetchAll]);

  useEffect(() => { load(); }, [load]);
  // Reset page when month changes
  useEffect(() => { setPage(1); }, [selMonthIdx]);

  const primaryCurrency = accounts[0]?.currency ?? 'USD';

  // Credit card account IDs — their charges are excluded from Cash In / Cash Out
  const ccAccountIds = useMemo(
    () => new Set(accounts.filter(a => a.type === 'credit_card').map(a => a.id)),
    [accounts]
  );

  // ── Month-filtered transactions (strict string comparison — no UTC shift) ──
  // mStart = "YYYY-MM-01", mEnd = "YYYY-MM-DD" — both already correct local dates
  const monthTransactions = useMemo(
    () => allTransactions.filter(t => t.occurred_on >= mStart && t.occurred_on <= mEnd),
    [allTransactions, mStart, mEnd]
  );

  // ── Carryover: net of ALL transactions BEFORE this month, excluding CC ──────
  // Opening balances from non-CC bank/cash accounts are the seed.
  // Then we add every income and subtract every expense from non-CC accounts.
  const prevTransactions = useMemo(
    () => allTransactions.filter(t => t.occurred_on < mStart),
    [allTransactions, mStart]
  );

  const carryover = useMemo(() => {
    // Sum opening balances of non-CC accounts as the base
    const openingBase = accounts
      .filter(a => a.type !== 'credit_card')
      .reduce((s, a) => s + a.opening_balance, 0);

    // Net of all past transactions excluding CC account transactions
    const prevNonCC  = prevTransactions.filter(t => !ccAccountIds.has(t.account_id));
    const prevInc    = prevNonCC.filter(t => t.kind === 'income' ).reduce((s, t) => s + t.amount, 0);
    const prevExp    = prevNonCC.filter(t => t.kind === 'expense').reduce((s, t) => s + t.amount, 0);
    const prevCCPay  = prevNonCC.filter(t => t.kind === 'transfer' && t.transfer_to_account_id != null && ccAccountIds.has(t.transfer_to_account_id!)).reduce((s, t) => s + t.amount, 0);

    return openingBase + prevInc - prevExp - prevCCPay;
  }, [accounts, prevTransactions, ccAccountIds]);

  // ── This-month stats — exclude CC account transactions ─────────────────────
  const nonCCMonth = useMemo(
    () => monthTransactions.filter(t => !ccAccountIds.has(t.account_id)),
    [monthTransactions, ccAccountIds]
  );

  const cashIn       = nonCCMonth.filter(t => t.kind === 'income' ).reduce((s, t) => s + t.amount, 0);
  const ccPayments   = nonCCMonth.filter(t => t.kind === 'transfer' && t.transfer_to_account_id != null && ccAccountIds.has(t.transfer_to_account_id!)).reduce((s, t) => s + t.amount, 0);
  const cashOut      = nonCCMonth.filter(t => t.kind === 'expense').reduce((s, t) => s + t.amount, 0) + ccPayments;
  const netThisMonth = cashIn - cashOut;

  // Running balance = carryover (opening balances + all past non-CC net) + this month net
  const runningBalance = carryover + netThisMonth;

  // ── Pagination on month-filtered data ──────────────────────
  const totalPages = Math.max(1, Math.ceil(monthTransactions.length / PAGE_SIZE));
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return monthTransactions.slice(start, start + PAGE_SIZE);
  }, [monthTransactions, page]);

  const kpis = [
    { label: 'Cash In',         value: formatCurrency(cashIn,         primaryCurrency), color: 'text-accent-green', sub: 'excl. credit cards' },
    { label: 'Cash Out',        value: formatCurrency(cashOut,        primaryCurrency), color: 'text-foreground',   sub: 'excl. credit cards' },
    { label: 'Net This Month',  value: formatCurrency(netThisMonth,   primaryCurrency), color: netThisMonth >= 0 ? 'text-accent-green' : 'text-destructive', sub: monthLabel },
    {
      label: 'Running Balance',
      value: formatCurrency(runningBalance, primaryCurrency),
      color: runningBalance >= 0 ? 'text-foreground' : 'text-destructive',
      sub: `opening ${formatCurrency(carryover, primaryCurrency)}`,
    },
  ];

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Transactions</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeBook ? `${activeBook.name} · ` : ''}{monthTransactions.length} entries in {monthLabel}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}
            className="rounded-xl h-8 gap-1.5 text-xs">
            <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate} className="rounded-xl h-8 gap-1.5 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" />
            New Transaction
          </Button>
        </div>
      </div>

      {/* ── Month navigator ── */}
      <div className="flex items-center gap-2 max-w-xs">
        <button
          onClick={() => setSelMonthIdx(i => Math.min(i + 1, months.length - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card hover:bg-secondary transition-colors shrink-0"
          disabled={selMonthIdx >= months.length - 1}
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex-1 text-center rounded-xl border border-border bg-card px-3 py-1.5">
          <p className="text-sm font-semibold text-foreground leading-tight">{monthLabel}</p>
          {isCurrentMonth && <p className="text-[10px] text-accent-green font-medium leading-tight">Current month</p>}
        </div>
        <button
          onClick={() => setSelMonthIdx(i => Math.max(i - 1, 0))}
          disabled={isCurrentMonth}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* ── KPI cards ── */}
      {allTransactions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map(k => (
            <div key={k.label} className="rounded-2xl bg-card border border-border px-4 py-3.5">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{k.label}</p>
              <p className={cn('text-base font-bold tabular-nums mt-1 leading-tight', k.color)}>{k.value}</p>
              {k.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 flex items-center justify-between gap-3">
          <p>{error}</p>
          <button onClick={refresh} className="text-xs font-medium hover:underline shrink-0">Retry</button>
        </div>
      )}

      {/* ── Content ── */}
      {isLoading && allTransactions.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <TransactionTable
            transactions={paginatedTransactions}
            accounts={accounts}
            categories={categories}
            onRefresh={refresh}
            onEdit={openEdit}
          />

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {monthTransactions.length} entries
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary transition-colors disabled:opacity-30"
                >
                  <PgPrev className="h-3.5 w-3.5" />
                </button>

                {/* Page number pills */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                      acc.push('...');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === '...' ? (
                      <span key={`dots-${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item as number)}
                        className={cn(
                          'h-8 min-w-[2rem] px-2 rounded-lg text-xs font-medium border transition-colors',
                          page === item
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border bg-card hover:bg-secondary'
                        )}
                      >
                        {item}
                      </button>
                    )
                  )}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary transition-colors disabled:opacity-30"
                >
                  <PgNext className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <AddTransactionModal
        open={modalOpen}
        onOpenChange={open => { setModalOpen(open); if (!open) setEditTarget(null); }}
        initial={editTarget}
        accounts={accounts}
        categories={categories}
        onSuccess={refresh}
      />
    </div>
  );
}
