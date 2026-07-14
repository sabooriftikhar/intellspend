'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { Transaction, Account, Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import TransactionTable from '@/components/dashboard/TransactionTable';
import AddTransactionModal from '@/components/dashboard/AddTransactionModal';
import { useBook } from '@/contexts/BookContext';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

interface AccountBalance { balance: number; currency: string; }
interface AccountWithBalance extends Account { balance: number; }

export default function TransactionsPage() {
  const { activeBook } = useBook();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts]         = useState<AccountWithBalance[]>([]);
  const [categories, setCategories]     = useState<Category[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [modalOpen, setModalOpen]       = useState(false);
  const [editTarget, setEditTarget]     = useState<Transaction | null>(null);

  const openCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditTarget(tx);
    setModalOpen(true);
  };

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const params = activeBook ? { book_id: activeBook.id } : {};
      const [txRes, accRes, catRes] = await Promise.all([
        api.get<Transaction[]>('/transactions/', { params: { ...params, limit: 1000 } }),
        api.get<Account[]>('/accounts/', { params }),
        api.get<Category[]>('/categories/', { params }),
      ]);
      const withBal: AccountWithBalance[] = await Promise.all(
        accRes.data.map(async a => {
          try {
            const r = await api.get<AccountBalance>(`/accounts/${a.id}/balance`, {
              params: activeBook ? { book_id: activeBook.id } : undefined,
            });
            return { ...a, balance: r.data.balance };
          } catch { return { ...a, balance: a.opening_balance }; }
        })
      );
      setTransactions(txRes.data);
      setAccounts(withBal);
      setCategories(catRes.data);
    } catch {
      setError('Unable to refresh transactions right now. Showing the last loaded snapshot.');
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

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  // Summary stats
  const income  = transactions.filter(t => t.kind === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.kind === 'expense').reduce((s, t) => s + t.amount, 0);
  const primaryCurrency = accounts[0]?.currency ?? 'USD';

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Transactions</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeBook ? `${activeBook.name} · ` : ''}{transactions.length} total entries
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}
            className="rounded-xl h-8 gap-1.5 text-xs">
            <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate}
            className="rounded-xl h-8 gap-1.5 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" />
            New Transaction
          </Button>
        </div>
      </div>

      {/* KPI row */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Income',  value: formatCurrency(income,           primaryCurrency), color: 'text-accent-green' },
            { label: 'Total Expense', value: formatCurrency(expense,          primaryCurrency), color: 'text-foreground' },
            { label: 'Net Flow',      value: formatCurrency(income - expense, primaryCurrency), color: income - expense >= 0 ? 'text-accent-green' : 'text-destructive' },
          ].map(k => (
            <div key={k.label} className="rounded-2xl bg-card border border-border px-4 py-3.5">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{k.label}</p>
              <p className={cn('text-base font-bold tabular-nums mt-1', k.color)}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading && transactions.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : error && transactions.length === 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-center space-y-3">
          <p className="text-sm font-medium text-amber-900">{error}</p>
          <button onClick={refresh} className="text-xs text-primary font-medium hover:underline">
            Try again
          </button>
        </div>
      ) : (
        <>
          {error && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-900">
              <div className="flex items-center justify-between gap-3">
                <p>{error}</p>
                <button onClick={refresh} className="text-xs font-medium hover:underline shrink-0">
                  Retry
                </button>
              </div>
            </div>
          )}
        <TransactionTable
          transactions={transactions}
          accounts={accounts}
          categories={categories}
          onRefresh={refresh}
          onEdit={openEdit}
        />
        </>
      )}

      <AddTransactionModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditTarget(null);
        }}
        initial={editTarget}
        accounts={accounts}
        categories={categories}
        onSuccess={refresh}
      />
    </div>
  );
}
