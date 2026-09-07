'use client';

import { useState } from 'react';
import { Plus, Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useBook } from '@/contexts/BookContext';
import { useDashboardData, SelectedMonth } from '@/hooks/useDashboardData';
import { getGreeting, formatCurrency, getMonthRangeFor } from '@/lib/format';
import BookSwitcher from '@/components/dashboard/BookSwitcher';
import AccountCard from '@/components/dashboard/AccountCard';
import CreditCardWidget from '@/components/dashboard/CreditCardWidget';
import IncomeExpenseChart from '@/components/dashboard/IncomeExpenseChart';
import MonthlyTrendChart from '@/components/dashboard/MonthlyTrendChart';
import CategorySpendChart from '@/components/dashboard/CategorySpendChart';
import AddTransactionModal from '@/components/dashboard/AddTransactionModal';
import WealthOverview from '@/components/dashboard/WealthOverview';
import UpcomingBills from '@/components/dashboard/UpcomingBills';
import MonthPicker from '@/components/ui/MonthPicker';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeBook, books, isLoading: bookLoading } = useBook();

  // Month selector — MUST be declared before useDashboardData
  const now = new Date();
  const [selMonth, setSelMonth] = useState<SelectedMonth>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const maxMonth: SelectedMonth = { year: now.getFullYear(), month: now.getMonth() };
  const { label: monthLabel } = getMonthRangeFor(selMonth.year, selMonth.month);

  const {
    accounts, bankAccounts, creditCards, transactions, categories,
    bills, monthlyIncome, monthlyExpense, primaryCurrency,
    trendData, ccIds, isLoading, error, refresh,
  } = useDashboardData(selMonth);

  const [modalOpen, setModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const displayName = user?.name || user?.email?.split('@')[0] || 'there';
  const loading = bookLoading || isLoading;
  const hasData = accounts.length > 0 || transactions.length > 0 || categories.length > 0 || bills.length > 0;
  const isAllBooksView = !activeBook && books.length > 0;
  const scopeLabel = activeBook?.name ?? (isAllBooksView ? 'All Books' : 'No books yet');

  // Selected-month transactions for the category chart (excluding CC)
  const { start: mStart, end: mEnd } = getMonthRangeFor(selMonth.year, selMonth.month);
  const monthTx = transactions.filter(
    t => t.occurred_on >= mStart && t.occurred_on <= mEnd && !ccIds.has(t.account_id)
  );

  const netFlow      = monthlyIncome - monthlyExpense;
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const pendingBills = bills.filter(b => b.status === 'pending').length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight capitalize">
            {getGreeting()}, {displayName}.
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeBook || isAllBooksView
              ? `${scopeLabel} · ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
              : 'Create a book to start tracking'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <BookSwitcher className="min-w-[130px]" />
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}
            className="rounded-xl h-8 gap-1.5 text-xs">
            <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}
            className="rounded-xl h-8 gap-1.5 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" />
            New Transaction
          </Button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && !hasData ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading your finances…</p>
        </div>
      ) : !hasData && !activeBook && !isAllBooksView ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-14 text-center">
          <p className="text-sm font-medium text-foreground mb-1">No book selected</p>
          <p className="text-xs text-muted-foreground">Create a book first to start tracking.</p>
        </div>
      ) : (
        <>
          {error && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 flex items-center justify-between gap-3">
              <p>{error}</p>
              <button onClick={handleRefresh} className="text-xs font-medium hover:underline shrink-0">Retry</button>
            </div>
          )}

          {/* ── Month picker ── */}
          <div className="flex items-center gap-3 flex-wrap">
            <MonthPicker value={selMonth} onChange={setSelMonth} maxMonth={maxMonth} />
            {selMonth.year === now.getFullYear() && selMonth.month === now.getMonth() && (
              <span className="text-xs text-accent-green font-semibold bg-accent-green/10 px-2 py-1 rounded-lg">
                Current month
              </span>
            )}
          </div>

          {/* ── KPI row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Total Balance',
                value: formatCurrency(totalBalance, primaryCurrency),
                color: 'text-foreground',
                sub: `${accounts.length} account${accounts.length !== 1 ? 's' : ''}`,
              },
              {
                label: 'Cash In',
                value: formatCurrency(monthlyIncome, primaryCurrency),
                color: 'text-accent-green',
                sub: `${monthLabel} (excl. credit cards)`,
              },
              {
                label: 'Cash Out',
                value: formatCurrency(monthlyExpense, primaryCurrency),
                color: 'text-foreground',
                sub: `${monthLabel} (excl. credit cards)`,
              },
              {
                label: 'Net Flow',
                value: formatCurrency(netFlow, primaryCurrency),
                color: netFlow >= 0 ? 'text-accent-green' : 'text-destructive',
                sub: netFlow >= 0 ? 'saved this month' : 'deficit this month',
              },
            ].map(k => (
              <div key={k.label} className="rounded-2xl bg-card border border-border px-4 py-3.5">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{k.label}</p>
                <p className={cn('text-lg font-bold tabular-nums mt-1 leading-tight', k.color)}>{k.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Main grid ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Left column */}
            <div className="xl:col-span-2 space-y-4">
              {bankAccounts.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Accounts</p>
                    <Link href="/accounts" className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1">
                      Manage <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {bankAccounts.map(acc => <AccountCard key={acc.id} account={acc} />)}
                  </div>
                </section>
              )}
              <IncomeExpenseChart income={monthlyIncome} expense={monthlyExpense} currency={primaryCurrency} />
              <MonthlyTrendChart data={trendData} currency={primaryCurrency} />
              <CategorySpendChart transactions={monthTx} categories={categories} currency={primaryCurrency} />
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {creditCards.length > 0 && (
                <section>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
                    Credit Cards
                  </p>
                  <div className="space-y-3">
                    {creditCards.map(card => (
                      <CreditCardWidget key={card.id} account={card} allAccounts={accounts} onRefresh={refresh} />
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Upcoming Bills
                    {pendingBills > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                        {pendingBills}
                      </span>
                    )}
                  </p>
                  <Link href="/bills" className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1">
                    All bills <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <UpcomingBills bills={bills} accounts={[...bankAccounts, ...creditCards]} onRefresh={refresh} />
              </section>

              {(bankAccounts.length > 0 || creditCards.length > 0) && (
                <WealthOverview bankAccounts={bankAccounts} creditCards={creditCards} primaryCurrency={primaryCurrency} />
              )}

              {transactions.length > 0 && (
                <div className="rounded-2xl bg-card border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-foreground">Recent Activity</p>
                    <Link href="/transactions" className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1">
                      View all <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {transactions.slice(0, 5).map(tx => {
                      const cat = tx.category_id ? categories.find(c => c.id === tx.category_id) : null;
                      return (
                        <div key={tx.id} className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="text-sm shrink-0">
                              {cat?.icon ?? (tx.kind === 'income' ? '💰' : ccIds.has(tx.account_id) ? '💳' : '💸')}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate leading-tight">{tx.description}</p>
                              <p className="text-[11px] text-muted-foreground">{tx.occurred_on}</p>
                            </div>
                          </div>
                          <span className={cn(
                            'text-xs font-semibold tabular-nums shrink-0',
                            ccIds.has(tx.account_id)
                              ? 'text-muted-foreground'
                              : tx.kind === 'income' ? 'text-accent-green' : 'text-foreground'
                          )}>
                            {ccIds.has(tx.account_id) ? '💳 ' : tx.kind === 'income' ? '+' : tx.kind === 'expense' ? '-' : ''}
                            {formatCurrency(tx.amount, tx.currency)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {bankAccounts.length === 0 && creditCards.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
                  <p className="text-xs text-muted-foreground">No accounts yet.</p>
                  <Link href="/accounts" className="text-xs text-primary font-medium hover:underline mt-1 block">Add an account →</Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <AddTransactionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        accounts={[...bankAccounts, ...creditCards]}
        categories={categories}
        onSuccess={refresh}
      />
    </div>
  );
}
