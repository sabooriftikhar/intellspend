'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useBook } from '@/contexts/BookContext';
import {
  Account,
  AccountBalance,
  AccountWithBalance,
  Bill,
  Category,
  Transaction,
} from '@/lib/types';
import { getMonthRange } from '@/lib/format';

export function useDashboardData() {
  const { activeBook } = useBook();

  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [primaryCurrency, setPrimaryCurrency] = useState('USD');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Increment this to force a re-fetch from anywhere (refresh button, onSuccess, etc.)
  const [refreshKey, setRefreshKey] = useState(0);

  // Track the latest fetch so a stale one can't overwrite newer data
  const fetchIdRef = useRef(0);

  useEffect(() => {
    // Reset when book changes or refresh is triggered
    if (!activeBook) {
      setAccounts([]);
      setTransactions([]);
      setCategories([]);
      setBills([]);
      setMonthlyIncome(0);
      setMonthlyExpense(0);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);

    const run = async () => {
      try {
        const { start, end } = getMonthRange();

        // 5 parallel requests
        const [accountsRes, txRes, categoriesRes, monthTxRes, billsRes] = await Promise.all([
          api.get<Account[]>('/accounts/', { params: { book_id: activeBook.id } }),
          api.get<Transaction[]>('/transactions/', {
            params: { book_id: activeBook.id, limit: 500 },
          }),
          api.get<Category[]>('/categories/', { params: { book_id: activeBook.id } }),
          api.get<Transaction[]>('/transactions/', {
            params: {
              book_id: activeBook.id,
              start_date: start,
              end_date: end,
              limit: 500,
            },
          }),
          api.get<Bill[]>('/bills/', { params: { book_id: activeBook.id } }),
        ]);

        // Bail out if a newer fetch has started
        if (fetchId !== fetchIdRef.current) return;

        const rawAccounts = accountsRes.data;

        // Fetch all balances in parallel, fall back to opening_balance on error
        const withBalances: AccountWithBalance[] = await Promise.all(
          rawAccounts.map(async (account) => {
            try {
              const balRes = await api.get<AccountBalance>(
                `/accounts/${account.id}/balance`
              );
              return { ...account, balance: balRes.data.balance };
            } catch {
              // Don't let one bad balance kill the whole dashboard
              return { ...account, balance: account.opening_balance };
            }
          })
        );

        if (fetchId !== fetchIdRef.current) return;

        if (rawAccounts.length > 0) {
          setPrimaryCurrency(rawAccounts[0].currency);
        }

        setAccounts(withBalances);
        setTransactions(txRes.data);
        setCategories(categoriesRes.data);
        setBills(billsRes.data);

        const monthTxs = monthTxRes.data;
        setMonthlyIncome(
          monthTxs
            .filter((t) => t.kind === 'income')
            .reduce((sum, t) => sum + t.amount, 0)
        );
        setMonthlyExpense(
          monthTxs
            .filter((t) => t.kind === 'expense')
            .reduce((sum, t) => sum + t.amount, 0)
        );
      } catch (err) {
        if (fetchId !== fetchIdRef.current) return;
        console.error('Dashboard fetch failed:', err);
        setError('Failed to load dashboard data. Check your connection and try again.');
      } finally {
        if (fetchId === fetchIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    run();
  // refreshKey in deps guarantees a fresh fetch every time refresh() is called,
  // even if activeBook reference didn't change.
  }, [activeBook, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const bankAccounts = accounts.filter((a) => a.type === 'bank' || a.type === 'cash');
  const creditCards = accounts.filter((a) => a.type === 'credit_card');

  return {
    accounts,
    bankAccounts,
    creditCards,
    transactions,
    categories,
    bills,
    monthlyIncome,
    monthlyExpense,
    primaryCurrency,
    isLoading,
    error,
    refresh,
  };
}
