'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ArrowUpDown,
  Search,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
} from 'lucide-react';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Transaction, Account, Category, TransactionKind } from '@/lib/types';
import { formatCurrency, formatShortDate, groupLabelForDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type SortField = 'occurred_on' | 'amount' | 'description' | 'kind';
type SortDir = 'asc' | 'desc';

interface TransactionTableProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onRefresh: () => void;
  onEdit: (tx: Transaction) => void;
}

interface EditingCell {
  id: number;
  field: 'description' | 'amount' | 'occurred_on';
  value: string;
}

const kindIcon: Record<TransactionKind, React.ReactNode> = {
  income: <TrendingUp className="h-3 w-3" />,
  expense: <TrendingDown className="h-3 w-3" />,
  transfer: <ArrowLeftRight className="h-3 w-3" />,
};

const kindStyle: Record<TransactionKind, string> = {
  income: 'bg-accent-green/10 text-accent-green',
  expense: 'bg-primary/8 text-primary',
  transfer: 'bg-accent-yellow/15 text-amber-700',
};

const amountStyle: Record<TransactionKind, string> = {
  income: 'text-accent-green',
  expense: 'text-foreground',
  transfer: 'text-amber-700',
};

export default function TransactionTable({
  transactions,
  accounts,
  categories,
  onRefresh,
  onEdit,
}: TransactionTableProps) {
  const [search, setSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterKind, setFilterKind] = useState('');
  const [sortField, setSortField] = useState<SortField>('occurred_on');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<number | null>(null);

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filtered = useMemo(() => {
    let result = [...transactions];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.amount.toString().includes(q)
      );
    }
    if (filterAccount) result = result.filter((t) => t.account_id === Number(filterAccount));
    if (filterKind) result = result.filter((t) => t.kind === filterKind);

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'occurred_on') cmp = a.occurred_on.localeCompare(b.occurred_on);
      else if (sortField === 'amount') cmp = a.amount - b.amount;
      else if (sortField === 'description') cmp = a.description.localeCompare(b.description);
      else cmp = a.kind.localeCompare(b.kind);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [transactions, search, filterAccount, filterKind, sortField, sortDir]);

  const grouped = useMemo(() => {
    const groups: { date: string; label: string; items: Transaction[] }[] = [];
    let currentDate = '';
    for (const tx of filtered) {
      if (tx.occurred_on !== currentDate) {
        currentDate = tx.occurred_on;
        groups.push({ date: currentDate, label: groupLabelForDate(currentDate), items: [] });
      }
      groups[groups.length - 1].items.push(tx);
    }
    return groups;
  }, [filtered]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const startEdit = (tx: Transaction, field: EditingCell['field']) => {
    setEditing({
      id: tx.id,
      field,
      value:
        field === 'amount' ? String(tx.amount) :
        field === 'occurred_on' ? tx.occurred_on :
        tx.description,
    });
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    const payload: Record<string, unknown> = {};
    if (editing.field === 'amount') payload.amount = parseFloat(editing.value);
    else if (editing.field === 'description') payload.description = editing.value;
    else payload.occurred_on = editing.value;
    try {
      await api.put(`/transactions/${editing.id}`, payload);
      setEditing(null);
      onRefresh();
    } catch { /* keep editing open */ }
  }, [editing, onRefresh]);

  const deleteTransaction = async (id: number) => {
    setDeleting(id);
    try {
      await api.delete(`/transactions/${id}`);
      onRefresh();
    } catch { /* silent */ } finally {
      setDeleting(null);
    }
  };

  const toggleGroup = (date: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className={cn(
        'flex items-center gap-1 hover:text-foreground transition-colors',
        sortField === field ? 'text-foreground' : ''
      )}
    >
      {children}
      <ArrowUpDown className={cn('h-3 w-3', sortField === field ? 'opacity-100' : 'opacity-40')} />
    </button>
  );

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Transactions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filtered.length} of {transactions.length} entries
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search transactions…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 w-48 rounded-xl border-border bg-background text-sm"
              />
            </div>
            {/* Account filter */}
            <Select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="h-9 w-36 rounded-xl border-border bg-background text-sm"
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
            {/* Kind filter */}
            <Select
              value={filterKind}
              onChange={(e) => setFilterKind(e.target.value)}
              className="h-9 w-28 rounded-xl border-border bg-background text-sm"
            >
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs w-28">
                <SortButton field="occurred_on">Date</SortButton>
              </th>
              <th className="text-left px-3 py-3 font-medium text-muted-foreground text-xs">
                <SortButton field="description">Description</SortButton>
              </th>
              <th className="text-left px-3 py-3 font-medium text-muted-foreground text-xs hidden md:table-cell">
                Account
              </th>
              <th className="text-left px-3 py-3 font-medium text-muted-foreground text-xs hidden lg:table-cell">
                Category
              </th>
              <th className="text-left px-3 py-3 font-medium text-muted-foreground text-xs">
                <SortButton field="kind">Type</SortButton>
              </th>
              <th className="text-right px-3 py-3 font-medium text-muted-foreground text-xs">
                <div className="flex justify-end">
                  <SortButton field="amount">Amount</SortButton>
                </div>
              </th>
              <th className="px-3 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-muted-foreground text-sm">
                  {search || filterAccount || filterKind
                    ? 'No transactions match your filters.'
                    : 'No transactions yet. Add your first entry to get started.'}
                </td>
              </tr>
            ) : (
              grouped.map((group) => (
                <React.Fragment key={group.date}>
                  {/* Group header */}
                  <tr
                    className="cursor-pointer select-none hover:bg-secondary/40 transition-colors"
                    onClick={() => toggleGroup(group.date)}
                  >
                    <td colSpan={7} className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        {collapsedGroups.has(group.date) ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {group.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground/60">
                          · {group.items.length} {group.items.length === 1 ? 'entry' : 'entries'}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Group rows */}
                  {!collapsedGroups.has(group.date) &&
                    group.items.map((tx) => {
                      const account = accountMap.get(tx.account_id);
                      const category = tx.category_id ? categoryMap.get(tx.category_id) : null;
                      const isEditing = editing?.id === tx.id;
                      const isDeleting = deleting === tx.id;

                      return (
                        <tr
                          key={tx.id}
                          className={cn(
                            'border-b border-border/40 hover:bg-secondary/20 transition-colors group',
                            isDeleting && 'opacity-40'
                          )}
                        >
                          {/* Date */}
                          <td className="px-5 py-3">
                            {isEditing && editing.field === 'occurred_on' ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="date"
                                  value={editing.value}
                                  onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                  className="h-7 text-xs w-32 rounded-lg"
                                  autoFocus
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                                  <Check className="h-3 w-3 text-accent-green" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                                  <X className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEdit(tx, 'occurred_on')}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors tabular-nums"
                              >
                                {formatShortDate(tx.occurred_on)}
                              </button>
                            )}
                          </td>

                          {/* Description */}
                          <td className="px-3 py-3">
                            {isEditing && editing.field === 'description' ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editing.value}
                                  onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                  className="h-7 text-xs rounded-lg"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit();
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                                  <Check className="h-3 w-3 text-accent-green" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                                  <X className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEdit(tx, 'description')}
                                className="text-left font-medium text-foreground hover:text-primary transition-colors max-w-[200px] truncate block"
                              >
                                {tx.description}
                              </button>
                            )}
                          </td>

                          {/* Account */}
                          <td className="px-3 py-3 hidden md:table-cell">
                            {account ? (
                              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                                {account.name}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Category */}
                          <td className="px-3 py-3 hidden lg:table-cell">
                            {category ? (
                              <span className="text-xs text-muted-foreground">{category.name}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Kind badge */}
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium capitalize',
                                kindStyle[tx.kind]
                              )}
                            >
                              {kindIcon[tx.kind]}
                              {tx.kind}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="px-3 py-3 text-right">
                            {isEditing && editing.field === 'amount' ? (
                              <div className="flex items-center justify-end gap-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editing.value}
                                  onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                  className="h-7 text-xs w-24 text-right rounded-lg"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit();
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                                  <Check className="h-3 w-3 text-accent-green" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                                  <X className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEdit(tx, 'amount')}
                                className={cn(
                                  'font-semibold tabular-nums text-sm hover:underline',
                                  amountStyle[tx.kind]
                                )}
                              >
                                {tx.kind === 'income' ? '+' : tx.kind === 'expense' ? '-' : ''}
                                {formatCurrency(tx.amount, tx.currency)}
                              </button>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg hover:bg-primary/10"
                                onClick={() => onEdit(tx)}
                                title="Edit transaction"
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg hover:bg-destructive/10"
                                onClick={() => deleteTransaction(tx.id)}
                                disabled={isDeleting}
                                title="Delete transaction"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="px-5 py-3 border-t border-border bg-secondary/20 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Showing {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">
              Total in:{' '}
              <span className="font-semibold text-accent-green">
                {formatCurrency(
                  filtered.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount, 0),
                  'USD'
                )}
              </span>
            </span>
            <span className="text-muted-foreground">
              Total out:{' '}
              <span className="font-semibold text-foreground">
                {formatCurrency(
                  filtered.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0),
                  'USD'
                )}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
