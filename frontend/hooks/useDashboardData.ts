'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useBook } from '@/contexts/BookContext';
import {
  Account, AccountBalance, AccountWithBalance,
  Bill, Category, Transaction,
} from '@/lib/types';
import { getMonthRangeFor } from '@/lib/format';

export interface MonthStat {
  month: string;
  income: number;
  expense: number;
}

export interface SelectedMonth {
  year: number;
  month: number; // 0-indexed
}

function buildRange(sel: SelectedMonth) {
  return getMonthRangeFor(sel.year, sel.month);
}

function offsetRange(base: SelectedMonth, offset: number) {
  const d = new Date(base.year, base.month + offset, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function useDashboardData(selectedMonth?: SelectedMonth) {
  const { activeBook } = useBook();

  const now = new Date();
  const effectiveMonth: SelectedMonth = selectedMonth ?? {
    year: now.getFullYear(),
    month: now.getMonth(),
  };

  const [accounts,        setAccounts]        = useState<AccountWithBalance[]>([]);
  const [transactions,    setTransactions]    = useState<Transaction[]>([]);
  const [categories,      setCategories]      = useState<Category[]>([]);
  const [bills,           setBills]           = useState<Bill[]>([]);
  const [monthlyIncome,   setMonthlyIncome]   = useState(0);
  const [monthlyExpense,  setMonthlyExpense]  = useState(0);
  const [primaryCurrency, setPrimaryCurrency] = useState('USD');
  const [trendData,       setTrendData]       = useState<MonthStat[]>([]);
  // IDs of credit-card accounts — used to exclude CC charges from totals
  const [ccIds,           setCcIds]           = useState<Set<number>>(new Set());
  const [isLoading,       setIsLoading]       = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [refreshKey,      setRefreshKey]      = useState(0);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);

    const run = async () => {
      try {
        const { start, end } = buildRange(effectiveMonth);
        const params = activeBook ? { book_id: activeBook.id } : {};

        const [accountsRes, txRes, categoriesRes, monthTxRes, billsRes] = await Promise.all([
          api.get<Account[]>('/accounts/',         { params }),
          api.get<Transaction[]>('/transactions/', { params: { ...params, limit: 500 } }),
          api.get<Category[]>('/categories/',      { params }),
          api.get<Transaction[]>('/transactions/', {
            params: { ...params, start_date: start, end_date: end, limit: 500 },
          }),
          api.get<Bill[]>('/bills/', { params }),
        ]);

        if (fetchId !== fetchIdRef.current) return;

        const rawAccounts = accountsRes.data;

        // Build CC id set BEFORE balance fetches so it's available below
        const creditCardIdSet = new Set(
          rawAccounts.filter(a => a.type === 'credit_card').map(a => a.id)
        );
        setCcIds(creditCardIdSet);

        // Fetch balances scoped to the active book — so each account card shows
        // only the balance contributed by transactions in THAT book, not globally.
        const balanceParams = activeBook ? { book_id: activeBook.id } : undefined;
        const withBalances: AccountWithBalance[] = await Promise.all(
          rawAccounts.map(async (acc) => {
            try {
              const r = await api.get<AccountBalance>(`/accounts/${acc.id}/balance`, {
                params: balanceParams,
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

        // Exclude credit-card account transactions from income/expense totals.
        // CC charges only affect the card balance. When a CC payment is made
        // FROM a bank account (transfer to CC), that's real cash out — count it as expense.
        const monthTxs = monthTxRes.data;
        const nonCCMonth = monthTxs.filter(t => !creditCardIdSet.has(t.account_id));
        const ccPaymentExpense = nonCCMonth
          .filter(t => t.kind === 'transfer' && t.transfer_to_account_id != null && creditCardIdSet.has(t.transfer_to_account_id!))
          .reduce((s, t) => s + t.amount, 0);
        setMonthlyIncome( nonCCMonth.filter(t => t.kind === 'income' ).reduce((s, t) => s + t.amount, 0));
        setMonthlyExpense(nonCCMonth.filter(t => t.kind === 'expense').reduce((s, t) => s + t.amount, 0) + ccPaymentExpense);

        // 6-month trend — also exclude CC transactions
        const trendRequests = Array.from({ length: 6 }, (_, i) => {
          const mo    = offsetRange(effectiveMonth, i - 5);
          const range = buildRange(mo);
          return api.get<Transaction[]>('/transactions/', {
            params: { ...params, start_date: range.start, end_date: range.end, limit: 500 },
          }).then(r => {
            const nonCC = r.data.filter(t => !creditCardIdSet.has(t.account_id));
            const ccPay = nonCC
              .filter(t => t.kind === 'transfer' && t.transfer_to_account_id != null && creditCardIdSet.has(t.transfer_to_account_id!))
              .reduce((s, t) => s + t.amount, 0);
            return {
              month:   new Date(mo.year, mo.month, 1).toLocaleString('default', { month: 'short' }),
              income:  nonCC.filter(t => t.kind === 'income' ).reduce((s, t) => s + t.amount, 0),
              expense: nonCC.filter(t => t.kind === 'expense').reduce((s, t) => s + t.amount, 0) + ccPay,
            };
          });
        });

        const trend = await Promise.all(trendRequests);
        if (fetchId !== fetchIdRef.current) return;
        setTrendData(trend);

      } catch (err) {
        if (fetchId !== fetchIdRef.current) return;
        console.error('Dashboard fetch failed:', err);
        setError('Unable to refresh data. Showing last loaded snapshot.');
      } finally {
        if (fetchId === fetchIdRef.current) setIsLoading(false);
      }
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBook, refreshKey, effectiveMonth.year, effectiveMonth.month]);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const bankAccounts = accounts.filter(a => a.type === 'bank' || a.type === 'cash');
  const creditCards  = accounts.filter(a => a.type === 'credit_card');

  return {
    accounts, bankAccounts, creditCards,
    transactions, categories, bills,
    monthlyIncome, monthlyExpense, primaryCurrency,
    trendData, ccIds, isLoading, error, refresh,
  };
}
