'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Building2, Banknote, Pencil, Trash2, Loader2,
  CreditCard, X, Check, RefreshCw,
} from 'lucide-react';
import api from '@/lib/api';
import { Account, Book, AccountType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useBook } from '@/contexts/BookContext';
import { usePreferences } from '@/contexts/PreferencesContext';

// ── Types ──────────────────────────────────────────────────────
interface AccountWithBalance extends Account {
  balance: number;
}

interface AccountBalance {
  balance: number;
  currency: string;
}

// ── Config maps ────────────────────────────────────────────────
const typeConfig: Record<AccountType, { label: string; icon: React.ElementType; iconBg: string; iconColor: string }> = {
  bank: { label: 'Bank', icon: Building2, iconBg: 'bg-primary/10', iconColor: 'text-primary' },
  cash: { label: 'Cash', icon: Banknote, iconBg: 'bg-accent-green/10', iconColor: 'text-accent-green' },
  credit_card: { label: 'Credit Card', icon: CreditCard, iconBg: 'bg-accent-yellow/15', iconColor: 'text-amber-700' },
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'PKR', 'AED', 'CAD', 'AUD', 'SGD', 'JPY'];

// ── Delete confirm ──────────────────────────────────────────────
function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Delete?</span>
      <button onClick={onConfirm} className="flex h-6 w-6 items-center justify-center rounded-md bg-destructive/10 hover:bg-destructive/20 transition-colors">
        <Check className="h-3 w-3 text-destructive" />
      </button>
      <button onClick={onCancel} className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary hover:bg-secondary/80 transition-colors">
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  );
}

// ── Account form modal ─────────────────────────────────────────
interface AccountFormModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Account | null;
  books: Book[];
  defaultBookId?: number;
  onSuccess: () => void;
}

const emptyForm = {
  name: '',
  type: 'bank' as AccountType,
  currency: 'USD',
  opening_balance: '0',
  credit_limit: '',
  statement_day: '',
  due_day: '',
  book_ids: [] as string[],
};

export function AccountFormModal({
  open, onOpenChange, initial, books, defaultBookId, onSuccess,
}: AccountFormModalProps) {
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        const defaultIds = initial?.book_ids?.length
          ? initial.book_ids.map(String)
          : defaultBookId
            ? [String(defaultBookId)]
            : books[0]
              ? [String(books[0].id)]
              : [];
        setForm({
          name: initial?.name ?? '',
          type: initial?.type ?? 'bank',
          currency: initial?.currency ?? 'USD',
          opening_balance: String(initial?.opening_balance ?? '0'),
          credit_limit: initial?.credit_limit != null ? String(initial.credit_limit) : '',
          statement_day: initial?.statement_day != null ? String(initial.statement_day) : '',
          due_day: initial?.due_day != null ? String(initial.due_day) : '',
          book_ids: defaultIds,
        });
        setError('');
      });
    }
  }, [open, initial, books, defaultBookId]);

  const set = (key: keyof typeof emptyForm, value: string | string[]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleBook = (bookId: number) => {
    const id = String(bookId);
    setForm((f) => ({
      ...f,
      book_ids: f.book_ids.includes(id)
        ? f.book_ids.filter((b) => b !== id)
        : [...f.book_ids, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || form.book_ids.length === 0) return;
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      type: form.type,
      currency: form.currency,
      opening_balance: parseFloat(form.opening_balance) || 0,
      credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : null,
      statement_day: form.statement_day ? parseInt(form.statement_day) : null,
      due_day: form.due_day ? parseInt(form.due_day) : null,
      book_ids: form.book_ids.map((id) => parseInt(id)),
    };
    try {
      if (initial) {
        await api.put(`/accounts/${initial.id}`, payload);
      } else {
        await api.post('/accounts/', payload);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;
      setError(typeof detail === 'string' ? detail : 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  const isCreditCard = form.type === 'credit_card';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-border bg-secondary/30">
          <DialogHeader>
            <DialogTitle>{initial ? 'Edit account' : 'New account'}</DialogTitle>
            <DialogDescription>
              {initial ? "Update this account's details." : 'Add a bank account, cash wallet, or credit card.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Account type pills */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Account type</Label>
            <div className="flex gap-2">
              {(['bank', 'cash', 'credit_card'] as AccountType[]).map((t) => {
                const cfg = typeConfig[t];
                const Icon = cfg.icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('type', t)}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium transition-all',
                      form.type === t
                        ? 'border-primary bg-primary/8 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Name <span className="text-destructive">*</span></Label>
            <Input id="acc-name" placeholder="e.g. Main Checking" required value={form.name}
              onChange={(e) => set('name', e.target.value)} className="rounded-xl" autoFocus />
          </div>

          {/* Books */}
          <div className="space-y-1.5">
            <Label>Books <span className="text-destructive">*</span></Label>
            <div className="flex flex-wrap gap-2">
              {books.map((b) => {
                const selected = form.book_ids.includes(String(b.id));
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBook(b.id)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                      selected
                        ? 'border-primary bg-primary/8 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                    )}
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
            {books.length === 0 && (
              <p className="text-xs text-muted-foreground">Create a book first to assign accounts.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Currency */}
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="acc-currency">Currency</Label>
              <Select id="acc-currency" value={form.currency}
                onChange={(e) => set('currency', e.target.value)} className="rounded-xl h-10">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
          </div>

          {/* Opening balance */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-opening">Opening balance</Label>
            <Input id="acc-opening" type="number" step="0.01" value={form.opening_balance}
              onChange={(e) => set('opening_balance', e.target.value)} className="rounded-xl" />
          </div>

          {/* Credit card specific fields */}
          {isCreditCard && (
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credit card details</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="acc-limit" className="text-xs">Credit limit</Label>
                  <Input id="acc-limit" type="number" step="0.01" placeholder="0.00"
                    value={form.credit_limit} onChange={(e) => set('credit_limit', e.target.value)}
                    className="rounded-xl h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-stday" className="text-xs">Statement day</Label>
                  <Input id="acc-stday" type="number" min="1" max="31" placeholder="1–31"
                    value={form.statement_day} onChange={(e) => set('statement_day', e.target.value)}
                    className="rounded-xl h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-due" className="text-xs">Due day</Label>
                  <Input id="acc-due" type="number" min="1" max="31" placeholder="1–31"
                    value={form.due_day} onChange={(e) => set('due_day', e.target.value)}
                    className="rounded-xl h-9 text-sm" />
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive bg-destructive/8 rounded-xl px-3 py-2">{error}</p>}

          <Button type="submit" disabled={saving || !form.name.trim() || form.book_ids.length === 0} className="w-full rounded-xl">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {initial ? 'Save changes' : 'Create account'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function AccountsPage() {
  const { books, activeBook } = useBook();
  const { preferences } = usePreferences();
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchAccounts = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Account[]>('/accounts/', {
        params: activeBook ? { book_id: activeBook.id } : {},
      });
      const raw = res.data;
      const withBalances = await Promise.all(
        raw.map(async (acc) => {
          try {
            const bal = await api.get<AccountBalance>(`/accounts/${acc.id}/balance`, {
              params: activeBook ? { book_id: activeBook.id } : undefined,
            });
            return { ...acc, balance: bal.data.balance };
          } catch {
            return { ...acc, balance: acc.opening_balance };
          }
        })
      );
      setAccounts(withBalances);
    } catch {
      setError('Unable to refresh accounts right now. Showing the last loaded snapshot.');
    }
  }, [activeBook]);

  const load = useCallback(async () => {
    setIsLoading(true);
    await fetchAccounts();
    setIsLoading(false);
  }, [fetchAccounts]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAccounts();
    setIsRefreshing(false);
  }, [fetchAccounts]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const handleEdit = (acc: Account) => { setEditTarget(acc); setModalOpen(true); };
  const handleCreate = () => { setEditTarget(null); setModalOpen(true); };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await api.delete(`/accounts/${id}`);
      await fetchAccounts();
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  // Group by type
  const bankAccounts = accounts.filter((a) => a.type === 'bank' || a.type === 'cash');
  const creditCards = accounts.filter((a) => a.type === 'credit_card');

  const totalAssets = bankAccounts.reduce((s, a) => s + Math.max(a.balance, 0), 0);
  const totalDebt = creditCards.reduce((s, a) => s + (a.balance < 0 ? Math.abs(a.balance) : 0), 0);
  const displayCurrency = preferences.displayCurrency || accounts[0]?.currency || 'USD';

  const AccountCard = ({ acc }: { acc: AccountWithBalance }) => {
    const cfg = typeConfig[acc.type];
    const Icon = cfg.icon;
    const isPos = acc.balance >= 0;
    const accountBooks = books.filter((b) => acc.book_ids.includes(b.id));

    return (
      <div className={cn(
        'rounded-2xl border bg-card p-5 flex flex-col gap-3 hover:shadow-md transition-all group',
        deleting === acc.id && 'opacity-40',
        'border-border'
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl shrink-0', cfg.iconBg)}>
              <Icon className={cn('h-5 w-5', cfg.iconColor)} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate text-sm">{acc.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{cfg.label}</Badge>
                {accountBooks.map((book) => (
                  <Badge key={book.id} variant="secondary" className="text-[10px] py-0 px-1.5">{book.name}</Badge>
                ))}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase">{acc.currency}</span>
        </div>

        <div>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {formatCurrency(acc.balance, acc.currency)}
          </p>
          <p className={cn('text-xs font-medium mt-1', isPos ? 'text-accent-green' : 'text-destructive')}>
            {isPos ? 'Available balance' : 'Overdrawn'}
          </p>
          {acc.type === 'credit_card' && acc.credit_limit && (
            <div className="mt-2">
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>Credit used</span>
                <span>{Math.min(Math.round((Math.abs(Math.min(acc.balance, 0)) / acc.credit_limit) * 100), 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-yellow transition-all"
                  style={{ width: `${Math.min(Math.round((Math.abs(Math.min(acc.balance, 0)) / acc.credit_limit) * 100), 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
              onClick={() => handleEdit(acc)}>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            {confirmDelete === acc.id ? (
              <DeleteConfirm onConfirm={() => handleDelete(acc.id)} onCancel={() => setConfirmDelete(null)} />
            ) : (
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
                onClick={() => setConfirmDelete(acc.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
          {acc.due_day && (
            <span className="text-xs text-muted-foreground">Due {acc.due_day}th</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeBook ? `Showing accounts in ${activeBook.name}` : 'All accounts across all books'}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing} className="rounded-xl gap-2">
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button onClick={handleCreate} className="rounded-xl gap-2">
            <Plus className="h-4 w-4" />
            New account
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
          <Building2 className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Total accounts</p>
            <p className="text-lg font-bold text-foreground">{accounts.length}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
          <Banknote className="h-4 w-4 text-accent-green" />
          <div>
            <p className="text-xs text-muted-foreground">Total assets</p>
            <p className="text-lg font-bold text-accent-green">{formatCurrency(totalAssets, displayCurrency)}</p>
          </div>
        </div>
        {totalDebt > 0 && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
            <CreditCard className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Total debt</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(totalDebt, displayCurrency)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : error && accounts.length === 0 ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-center space-y-3">
              <p className="text-sm font-medium text-amber-900">{error}</p>
              <button onClick={refresh} className="text-xs text-primary font-medium hover:underline">
                Try again
              </button>
            </div>
          ) : accounts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground">No accounts yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add your bank accounts, cash wallets, and credit cards.
          </p>
          <Button onClick={handleCreate} variant="outline" className="rounded-xl gap-2">
            <Plus className="h-4 w-4" />
            Add first account
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
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

          {bankAccounts.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Bank & Cash accounts
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {bankAccounts.map((acc) => <AccountCard key={acc.id} acc={acc} />)}
                <button onClick={handleCreate}
                  className="rounded-2xl border-2 border-dashed border-border bg-card p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all min-h-40">
                  <Plus className="h-5 w-5" />
                  <span className="text-sm font-medium">Add account</span>
                </button>
              </div>
            </section>
          )}

          {creditCards.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Credit cards
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {creditCards.map((acc) => <AccountCard key={acc.id} acc={acc} />)}
              </div>
            </section>
          )}

          {accounts.length === 0 && (
            <button onClick={handleCreate}
              className="rounded-2xl border-2 border-dashed border-border bg-card p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all min-h-30 w-full">
              <Plus className="h-5 w-5" />
              <span className="text-sm font-medium">Add account</span>
            </button>
          )}
        </div>
      )}

      <AccountFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initial={editTarget}
        books={books}
        defaultBookId={activeBook?.id}
        onSuccess={load}
      />
    </div>
  );
}
