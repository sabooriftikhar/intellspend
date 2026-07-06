'use client';

import { useState } from 'react';
import { Plus, Loader2, Download, CalendarDays, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBook } from '@/contexts/BookContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { getGreeting } from '@/lib/format';
import BookSwitcher from '@/components/dashboard/BookSwitcher';
import AccountCard from '@/components/dashboard/AccountCard';
import CreditCardWidget from '@/components/dashboard/CreditCardWidget';
import IncomeExpenseChart from '@/components/dashboard/IncomeExpenseChart';
import TransactionTable from '@/components/dashboard/TransactionTable';
import AddTransactionModal from '@/components/dashboard/AddTransactionModal';
import WealthOverview from '@/components/dashboard/WealthOverview';
import UpcomingBills from '@/components/dashboard/UpcomingBills';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeBook, isLoading: bookLoading } = useBook();
  const {
    bankAccounts,
    creditCards,
    accounts,
    transactions,
    categories,
    bills,
    monthlyIncome,
    monthlyExpense,
    primaryCurrency,
    isLoading,
    error,
    refresh,
  } = useDashboardData();

  const [modalOpen, setModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const displayName = user?.email?.split('@')[0] ?? 'there';
  const loading = bookLoading || isLoading;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* ── Top header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground capitalize tracking-tight">
            {getGreeting()}, {displayName}.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeBook
              ? `Managing ${activeBook.name} book · ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
              : 'Select a book to start tracking'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <BookSwitcher className="min-w-[140px]" />

          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-border gap-2 text-sm h-9"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            onClick={() => setModalOpen(true)}
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 gap-2 text-sm font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Transaction
          </Button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground font-medium">
          <CalendarDays className="h-3.5 w-3.5" />
          This Month
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground font-medium hover:bg-secondary transition-colors">
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      {/* ── Loading state ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your finances…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <button
            onClick={handleRefresh}
            className="text-xs text-primary font-medium hover:underline"
          >
            Try again
          </button>
        </div>
      ) : !activeBook ? (
        /* ── No book selected ── */
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
          <p className="text-base font-medium text-foreground mb-1">No book selected</p>
          <p className="text-sm text-muted-foreground">
            Create a book first to start tracking your finances.
          </p>
        </div>
      ) : (
        <>
          {/* ── Main 3-column grid ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

            {/* ── Left column (2/3 width) ── */}
            <div className="xl:col-span-2 space-y-5">

              {/* Account cards */}
              {bankAccounts.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Accounts
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {bankAccounts.length} account{bankAccounts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {bankAccounts.map((account) => (
                      <AccountCard key={account.id} account={account} />
                    ))}
                  </div>
                </section>
              )}

              {/* Income/Expense donut chart */}
              <IncomeExpenseChart
                income={monthlyIncome}
                expense={monthlyExpense}
                currency={primaryCurrency}
              />
            </div>

            {/* ── Right column (1/3 width) ── */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  My Finances
                </h2>
              </div>

              {/* Credit cards */}
              {creditCards.length > 0 ? (
                <div className="space-y-4">
                  {creditCards.map((card) => (
                    <CreditCardWidget key={card.id} account={card} />
                  ))}
                </div>
              ) : null}

              {/* Upcoming bills */}
              <UpcomingBills
                bills={bills}
                accounts={[...bankAccounts, ...creditCards]}
                onRefresh={refresh}
              />

              {/* Wealth overview */}
              {(bankAccounts.length > 0 || creditCards.length > 0) && (
                <WealthOverview
                  bankAccounts={bankAccounts}
                  creditCards={creditCards}
                  primaryCurrency={primaryCurrency}
                />
              )}

              {/* Empty state if no accounts at all */}
              {bankAccounts.length === 0 && creditCards.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No accounts yet. Add accounts to see your finances here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Transaction table ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Transactions
              </h2>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add entry
              </button>
            </div>
            <TransactionTable
              transactions={transactions}
              accounts={[...bankAccounts, ...creditCards]}
              categories={categories}
              onRefresh={refresh}
            />
          </section>
        </>
      )}

      {/* Add transaction modal */}
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
