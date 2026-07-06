'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Account, Category, TransactionKind, AccountType, CategoryKind, Transaction } from '@/lib/types';
import { useBook } from '@/contexts/BookContext';
import { Plus, Loader2, TrendingDown, TrendingUp, ArrowLeftRight, ChevronDown, X, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Inline quick-add forms ─────────────────────────────────────
interface QuickAddAccountProps {
  books: { id: number; name: string }[];
  defaultBookId?: number;
  onCreated: (acc: Account) => void;
  onCancel: () => void;
}

function QuickAddAccount({ books, defaultBookId, onCreated, onCancel }: QuickAddAccountProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [currency, setCurrency] = useState('USD');
  const [bookId, setBookId] = useState(String(defaultBookId ?? books[0]?.id ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim() || !bookId) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.post<Account>('/accounts/', {
        name: name.trim(),
        type,
        currency,
        opening_balance: 0,
        book_ids: [parseInt(bookId)],
      });
      onCreated(res.data);
    } catch (err: unknown) {
      const detail = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;
      setError(typeof detail === 'string' ? detail : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-primary">Quick-add account</p>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Account name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-xs rounded-lg"
          autoFocus
        />
        <Select value={type} onChange={(e) => setType(e.target.value as AccountType)} className="h-8 text-xs rounded-lg">
          <option value="bank">Bank</option>
          <option value="cash">Cash</option>
          <option value="credit_card">Credit Card</option>
        </Select>
        <Select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-8 text-xs rounded-lg">
          {['USD', 'EUR', 'GBP', 'INR', 'PKR', 'AED', 'CAD'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Select value={bookId} onChange={(e) => setBookId(e.target.value)} className="h-8 text-xs rounded-lg">
          <option value="">Select book</option>
          {books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        size="sm"
        onClick={handleCreate}
        disabled={saving || !name.trim() || !bookId}
        className="w-full h-8 text-xs rounded-lg"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
        Create account
      </Button>
    </div>
  );
}

interface QuickAddCategoryProps {
  kind: CategoryKind;
  books: { id: number; name: string }[];
  defaultBookId?: number;
  onCreated: (cat: Category) => void;
  onCancel: () => void;
}

function QuickAddCategory({ kind, books, defaultBookId, onCreated, onCancel }: QuickAddCategoryProps) {
  const [name, setName] = useState('');
  const [bookId, setBookId] = useState(String(defaultBookId ?? books[0]?.id ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.post<Category>('/categories/', {
        name: name.trim(),
        kind,
        book_id: bookId ? parseInt(bookId) : null,
        icon: null,
        color: null,
      });
      onCreated(res.data);
    } catch (err: unknown) {
      const detail = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;
      setError(typeof detail === 'string' ? detail : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-accent-green/30 bg-accent-green/5 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-accent-green">Quick-add category</p>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-xs rounded-lg"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
        />
        <Select value={bookId} onChange={(e) => setBookId(e.target.value)} className="h-8 text-xs rounded-lg">
          <option value="">Global</option>
          {books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        size="sm"
        onClick={handleCreate}
        disabled={saving || !name.trim()}
        className={cn(
          'w-full h-8 text-xs rounded-lg',
          kind === 'income'
            ? 'bg-accent-green hover:bg-accent-green/90 text-white'
            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
        )}
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
        Create category
      </Button>
    </div>
  );
}

// ── Main modal ──────────────────────────────────────────────────
interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  categories: Category[];
  onSuccess: () => void;
  initial?: Transaction | null;
}

const defaultForm = {
  kind: 'expense' as TransactionKind,
  account_id: '',
  category_id: '',
  transfer_to_account_id: '',
  amount: '',
  description: '',
  occurred_on: new Date().toISOString().slice(0, 10),
};

const kindConfig = {
  expense: { label: 'Expense', icon: TrendingDown, activeClass: 'bg-primary text-primary-foreground shadow-sm', inactiveClass: 'text-muted-foreground hover:bg-secondary' },
  income: { label: 'Income', icon: TrendingUp, activeClass: 'bg-accent-green text-white shadow-sm', inactiveClass: 'text-muted-foreground hover:bg-secondary' },
  transfer: { label: 'Transfer', icon: ArrowLeftRight, activeClass: 'bg-accent-yellow text-amber-900 shadow-sm', inactiveClass: 'text-muted-foreground hover:bg-secondary' },
};

export default function AddTransactionModal({
  open, onOpenChange, accounts: initialAccounts, categories: initialCategories, onSuccess, initial,
}: AddTransactionModalProps) {
  const { activeBook, books } = useBook();
  const isEditing = Boolean(initial);
  const [form, setForm] = useState(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Local lists (can grow via quick-add)
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  // Quick-add panels
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  // Sync when parent refreshes
  useEffect(() => { setAccounts(initialAccounts); }, [initialAccounts]);
  useEffect(() => { setCategories(initialCategories); }, [initialCategories]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        kind: initial.kind,
        account_id: String(initial.account_id),
        category_id: initial.category_id ? String(initial.category_id) : '',
        transfer_to_account_id: initial.transfer_to_account_id ? String(initial.transfer_to_account_id) : '',
        amount: String(initial.amount),
        description: initial.description,
        occurred_on: initial.occurred_on,
      });
    } else {
      setForm({ ...defaultForm, occurred_on: new Date().toISOString().slice(0, 10) });
    }
    setError('');
    setShowAddAccount(false);
    setShowAddCategory(false);
  }, [open, initial]);

  const filteredCategories = categories.filter(
    (c) => form.kind === 'transfer' || c.kind === form.kind
  );

  const handleAccountCreated = (acc: Account) => {
    setAccounts((prev) => [...prev, acc]);
    setForm((f) => ({ ...f, account_id: String(acc.id) }));
    setShowAddAccount(false);
  };

  const handleCategoryCreated = (cat: Category) => {
    setCategories((prev) => [...prev, cat]);
    setForm((f) => ({ ...f, category_id: String(cat.id) }));
    setShowAddCategory(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bookId = initial?.book_id ?? activeBook?.id;
    if (!bookId || !form.account_id || !form.amount) return;
    const selectedAccount = accounts.find((a) => a.id === Number(form.account_id));
    if (!selectedAccount) return;

    setIsSubmitting(true);
    setError('');
    const payload = {
      book_id: bookId,
      account_id: Number(form.account_id),
      category_id: form.category_id ? Number(form.category_id) : null,
      kind: form.kind,
      amount: parseFloat(form.amount),
      currency: selectedAccount.currency,
      description: form.description || `${form.kind} transaction`,
      occurred_on: form.occurred_on,
      transfer_to_account_id:
        form.kind === 'transfer' && form.transfer_to_account_id
          ? Number(form.transfer_to_account_id) : null,
    };
    try {
      if (initial) {
        await api.put(`/transactions/${initial.id}`, payload);
      } else {
        await api.post('/transactions/', payload);
      }
      setForm({ ...defaultForm, occurred_on: new Date().toISOString().slice(0, 10) });
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;
      setError(typeof message === 'string' ? message : `Failed to ${isEditing ? 'update' : 'create'} transaction`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setForm({ ...defaultForm, occurred_on: new Date().toISOString().slice(0, 10) });
      setError('');
      setShowAddAccount(false);
      setShowAddCategory(false);
    }
    onOpenChange(value);
  };

  const selectedAccount = accounts.find((a) => a.id === Number(form.account_id));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 gap-0 overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className={cn(
          'px-6 pt-6 pb-5 transition-colors duration-200',
          form.kind === 'income' ? 'bg-accent-green/8' : form.kind === 'transfer' ? 'bg-accent-yellow/10' : 'bg-primary/5'
        )}>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {isEditing ? 'Edit Transaction' : 'Add Transaction'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {isEditing ? 'Update this entry.' : 'Record a new entry for '}
              {!isEditing && (
                <span className="font-medium text-foreground">{activeBook?.name ?? 'your book'}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Kind toggle */}
          <div className="flex gap-1.5 mt-4 bg-secondary rounded-xl p-1">
            {(['expense', 'income', 'transfer'] as TransactionKind[]).map((kind) => {
              const config = kindConfig[kind];
              const Icon = config.icon;
              const isActive = form.kind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, kind, category_id: '' }))}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150',
                    isActive ? config.activeClass : config.inactiveClass
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Amount — prominent */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground pointer-events-none">
                {selectedAccount?.currency?.slice(0, 1) ?? '$'}
              </span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="pl-8 h-12 text-xl font-bold rounded-xl border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Account */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="t-account" className="text-xs font-medium text-muted-foreground">
                  Account
                </Label>
                <button
                  type="button"
                  onClick={() => { setShowAddAccount((v) => !v); setShowAddCategory(false); }}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              </div>
              <Select
                id="t-account"
                required
                value={form.account_id}
                onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}
                className="rounded-xl border-border h-10 text-sm"
              >
                <option value="">Select account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                ))}
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="t-date" className="text-xs font-medium text-muted-foreground">
                Date
              </Label>
              <Input
                id="t-date"
                type="date"
                required
                value={form.occurred_on}
                onChange={(e) => setForm((f) => ({ ...f, occurred_on: e.target.value }))}
                className="h-10 rounded-xl border-border text-sm"
              />
            </div>
          </div>

          {/* Quick-add account panel */}
          {showAddAccount && (
            <QuickAddAccount
              books={books}
              defaultBookId={activeBook?.id}
              onCreated={handleAccountCreated}
              onCancel={() => setShowAddAccount(false)}
            />
          )}

          {/* Transfer destination */}
          {form.kind === 'transfer' && (
            <div className="space-y-1.5">
              <Label htmlFor="t-transfer-to" className="text-xs font-medium text-muted-foreground">
                Transfer to
              </Label>
              <Select
                id="t-transfer-to"
                required
                value={form.transfer_to_account_id}
                onChange={(e) => setForm((f) => ({ ...f, transfer_to_account_id: e.target.value }))}
                className="rounded-xl border-border h-10 text-sm"
              >
                <option value="">Select destination</option>
                {accounts
                  .filter((a) => String(a.id) !== form.account_id)
                  .map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </div>
          )}

          {/* Category */}
          {form.kind !== 'transfer' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="t-category" className="text-xs font-medium text-muted-foreground">
                  Category
                </Label>
                <button
                  type="button"
                  onClick={() => { setShowAddCategory((v) => !v); setShowAddAccount(false); }}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              </div>
              <Select
                id="t-category"
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                className="rounded-xl border-border h-10 text-sm"
              >
                <option value="">No category</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
                ))}
              </Select>
            </div>
          )}

          {/* Quick-add category panel */}
          {showAddCategory && form.kind !== 'transfer' && (
            <QuickAddCategory
              kind={form.kind === 'income' ? 'income' : 'expense'}
              books={books}
              defaultBookId={activeBook?.id}
              onCreated={handleCategoryCreated}
              onCancel={() => setShowAddCategory(false)}
            />
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="t-description" className="text-xs font-medium text-muted-foreground">
              Description
            </Label>
            <Input
              id="t-description"
              placeholder="What was this for?"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="h-10 rounded-xl border-border text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/8 rounded-xl px-3 py-2.5">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || accounts.length === 0 || (!isEditing && !activeBook)}
            className={cn(
              'w-full h-11 rounded-xl font-semibold transition-all',
              form.kind === 'income'
                ? 'bg-accent-green hover:bg-accent-green/90 text-white'
                : form.kind === 'transfer'
                  ? 'bg-accent-yellow hover:bg-accent-yellow/90 text-amber-900'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            )}
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />{isEditing ? 'Saving…' : 'Adding…'}</>
            ) : isEditing ? (
              <><Pencil className="h-4 w-4 mr-2" />Save changes</>
            ) : (
              <><Plus className="h-4 w-4 mr-2" />Add {kindConfig[form.kind].label}</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
