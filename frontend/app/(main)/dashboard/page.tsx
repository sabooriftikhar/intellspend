'use client';

import { useState } from 'react';
import { Plus, Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useBook } from '@/contexts/BookContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { getGreeting, formatCurrency } from '@/lib/format';
import BookSwitcher from '@/components/dashboard/BookSwitcher';
import AccountCard from '@/components/dashboard/AccountCard';
import CreditCardWidget from '@/components/dashboard/CreditCardWidget';
import IncomeExpenseChart from '@/components/dashboard/IncomeExpenseChart';
import MonthlyTrendChart from '@/components/dashboard/MonthlyTrendChart';
import CategorySpendChart from '@/components/dashboard/CategorySpendChart';
import AddTransactionModal from '@/components/dashboard/AddTransactionModal';
import WealthOverview from '@/components/dashboard/WealthOverview';
import UpcomingBills from '@/components/dashboard/UpcomingBills';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeBook, isLoading: bookLoading } = useBook();
  const {
    bankAccounts, creditCards, transactions, categories,
    bills, monthlyIncome, monthlyExpense, primaryCurrency,
    trendData, isLoading, error, refresh,
  } = useDashboardData();

  const [modalOpen, setModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const displayName = user?.name || user?.email?.split('@')[0] || 'there';
  const loading = bookLoading || isLoading;

  // This month's transactions only
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthTx = transactions.filter(t => new Date(t.occurred_on + 'T00:00:00') >= monthStart);

  const netFlow = monthlyIncome - monthlyExpense;
  const totalAssets = bankAccounts.reduce((s, a) => s + Math.max(a.balance, 0), 0);
  const pendingBillsCount = bills.filter(b => b.status === 'pending').length;

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
            {activeBook
              ? `${activeBook.name} · ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
              : 'Select a book to start'}
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
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading your finances…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={handleRefresh} className="text-xs text-primary font-medium hover:underline">
            Try again
          </button>
        </div>
      ) : !activeBook ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-14 text-center">
          <p className="text-sm font-medium text-foreground mb-1">No book selected</p>
          <p className="text-xs text-muted-foreground">Create a book first to start tracking.</p>
        </div>
      ) : (
        <>
          {/* ── KPI summary row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Assets',   value: formatCurrency(totalAssets,     primaryCurrency), color: 'text-foreground',  sub: `${bankAccounts.length} accounts` },
              { label: 'This Month In',  value: formatCurrency(monthlyIncome,   primaryCurrency), color: 'text-accent-green', sub: 'income' },
              { label: 'This Month Out', value: formatCurrency(monthlyExpense,  primaryCurrency), color: 'text-foreground',  sub: 'expenses' },
              {
                label: 'Net Flow',
                value: formatCurrency(Math.abs(netFlow), primaryCurrency),
                color: netFlow >= 0 ? 'text-accent-green' : 'text-destructive',
                sub: netFlow >= 0 ? 'saved' : 'deficit',
              },
            ].map(k => (
              <div key={k.label} className="rounded-2xl bg-card border border-border px-4 py-3.5">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{k.label}</p>
                <p className={cn('text-lg font-bold tabular-nums mt-1 leading-tight', k.color)}>{k.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Main grid: left(2/3) + right(1/3) ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

            {/* Left column */}
            <div className="xl:col-span-2 space-y-4">

              {/* Account cards */}
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

              {/* Monthly overview donut */}
              <IncomeExpenseChart
                income={monthlyIncome}
                expense={monthlyExpense}
                currency={primaryCurrency}
              />

              {/* 6-month trend line chart */}
              <MonthlyTrendChart data={trendData} currency={primaryCurrency} />

              {/* Category spend bar chart */}
              <CategorySpendChart
                transactions={monthTx}
                categories={categories}
                currency={primaryCurrency}
              />
            </div>

            {/* Right column */}
            <div className="space-y-4">

              {/* Credit cards */}
              {creditCards.length > 0 && (
                <section>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
                    Credit Cards
                  </p>
                  <div className="space-y-3">
                    {creditCards.map(card => <CreditCardWidget key={card.id} account={card} />)}
                  </div>
                </section>
              )}

              {/* Upcoming bills */}
              <section>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Upcoming Bills
                    {pendingBillsCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                        {pendingBillsCount}
                      </span>
                    )}
                  </p>
                  <Link href="/bills" className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1">
                    All bills <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <UpcomingBills
                  bills={bills}
                  accounts={[...bankAccounts, ...creditCards]}
                  onRefresh={refresh}
                />
              </section>

              {/* Wealth overview */}
              {(bankAccounts.length > 0 || creditCards.length > 0) && (
                <WealthOverview
                  bankAccounts={bankAccounts}
                  creditCards={creditCards}
                  primaryCurrency={primaryCurrency}
                />
              )}

              {/* Recent activity summary */}
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
                      const cat = tx.category_id
                        ? categories.find(c => c.id === tx.category_id)
                        : null;
                      return (
                        <div key={tx.id} className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="text-sm shrink-0">{cat?.icon ?? (tx.kind === 'income' ? '💰' : '💸')}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate leading-tight">
                                {tx.description}
                              </p>
                              <p className="text-[11px] text-muted-foreground">{tx.occurred_on}</p>
                            </div>
                          </div>
                          <span className={cn(
                            'text-xs font-semibold tabular-nums shrink-0',
                            tx.kind === 'income' ? 'text-accent-green' : 'text-foreground'
                          )}>
                            {tx.kind === 'income' ? '+' : tx.kind === 'expense' ? '-' : ''}
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
                  <Link href="/accounts" className="text-xs text-primary font-medium hover:underline mt-1 block">
                    Add an account →
                  </Link>
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
