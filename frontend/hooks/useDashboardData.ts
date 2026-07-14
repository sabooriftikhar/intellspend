'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useBook } from '@/contexts/BookContext';
import {
  Account, AccountBalance, AccountWithBalance,
  Bill, Category, Transaction,
} from '@/lib/types';

export interface MonthStat {
  month: string;   // "Jan", "Feb", …
  income: number;
  expense: number;
}

function getMonthRange(offsetMonths = 0) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offsetMonths;
  const d = new Date(y, m, 1);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last  = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  return { start: fmt(first), end: fmt(last), label: first.toLocaleString('default', { month: 'short' }) };
}

export function useDashboardData() {
  const { activeBook } = useBook();

  const [accounts,       setAccounts]       = useState<AccountWithBalance[]>([]);
  const [transactions,   setTransactions]   = useState<Transaction[]>([]);
  const [categories,     setCategories]     = useState<Category[]>([]);
  const [bills,          setBills]          = useState<Bill[]>([]);
  const [monthlyIncome,  setMonthlyIncome]  = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [primaryCurrency,setPrimaryCurrency]= useState('USD');
  const [trendData,      setTrendData]      = useState<MonthStat[]>([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [refreshKey,     setRefreshKey]     = useState(0);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);

    const run = async () => {
      try {
        const thisMonth = getMonthRange(0);
        const params = activeBook ? { book_id: activeBook.id } : {};

        // Core parallel fetches
        const [accountsRes, txRes, categoriesRes, monthTxRes, billsRes] = await Promise.all([
          api.get<Account[]>('/accounts/',      { params }),
          api.get<Transaction[]>('/transactions/', { params: { ...params, limit: 500 } }),
          api.get<Category[]>('/categories/',   { params }),
          api.get<Transaction[]>('/transactions/', {
            params: { ...params, start_date: thisMonth.start, end_date: thisMonth.end, limit: 500 },
          }),
          api.get<Bill[]>('/bills/', { params }),
        ]);

        if (fetchId !== fetchIdRef.current) return;

        const rawAccounts = accountsRes.data;
        const withBalances: AccountWithBalance[] = await Promise.all(
          rawAccounts.map(async (acc) => {
            try {
              const r = await api.get<AccountBalance>(`/accounts/${acc.id}/balance`, {
                params: activeBook ? { book_id: activeBook.id } : undefined,
              });
              return { ...acc, balance: r.data.balance };
            } catch {
              return { ...acc, balance: acc.opening_balance };
            }
          })
        );

        if (fetchId !== fetchIdRef.current) return;

        if (rawAccounts.length > 0) setPrimaryCurrency(rawAccounts[0].currency);

        setAccounts(withBalances);
        setTransactions(txRes.data);
        setCategories(categoriesRes.data);
        setBills(billsRes.data);

        const monthTxs = monthTxRes.data;
        setMonthlyIncome(monthTxs.filter(t => t.kind === 'income').reduce((s, t) => s + t.amount, 0));
        setMonthlyExpense(monthTxs.filter(t => t.kind === 'expense').reduce((s, t) => s + t.amount, 0));

        // Fetch 6-month trend (current + 5 previous months)
        const trendRequests = Array.from({ length: 6 }, (_, i) => {
          const range = getMonthRange(i - 5);
          return api.get<Transaction[]>('/transactions/', {
            params: { ...params, start_date: range.start, end_date: range.end, limit: 500 },
          }).then(r => ({
            month: range.label,
            income:  r.data.filter(t => t.kind === 'income').reduce((s, t) => s + t.amount, 0),
            expense: r.data.filter(t => t.kind === 'expense').reduce((s, t) => s + t.amount, 0),
          }));
        });

        const trend = await Promise.all(trendRequests);
        if (fetchId !== fetchIdRef.current) return;
        setTrendData(trend);

      } catch (err) {
        if (fetchId !== fetchIdRef.current) return;
        console.error('Dashboard fetch failed:', err);
        setError('Unable to refresh dashboard data right now. Showing the last loaded snapshot.');
      } finally {
        if (fetchId === fetchIdRef.current) setIsLoading(false);
      }
    };

    run();
  }, [activeBook, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const bankAccounts = accounts.filter(a => a.type === 'bank' || a.type === 'cash');
  const creditCards  = accounts.filter(a => a.type === 'credit_card');

  return {
    accounts, bankAccounts, creditCards,
    transactions, categories, bills,
    monthlyIncome, monthlyExpense, primaryCurrency,
    trendData, isLoading, error, refresh,
  };
}
