'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Tag, Pencil, Trash2, Loader2, X, Check, TrendingUp, TrendingDown, BarChart2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import api from '@/lib/api';
import { Category, CategoryKind, Book, Transaction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useBook } from '@/contexts/BookContext';
import { formatCurrency, getMonthRangeFor } from '@/lib/format';
import MonthPicker, { PickedMonth } from '@/components/ui/MonthPicker';

const ICON_PRESETS = ['🏠','🛒','💡','🚗','🍔','💊','📚','👗','💰','🎯','📱','✈️','🏋️','🎬','☕','🔧','💳','🏦','💼','🎁'];
const COLOR_PRESETS = ['#003333','#00c853','#ffca28','#e53935','#1976d2','#7b1fa2','#f57c00','#0097a7','#5d4037','#455a64'];
const BAR_COLORS   = ['#0a2929','#1a4444','#00897b','#00c853','#4a9e9e','#ffca28','#ff7043','#ab47bc','#1976d2','#5d4037'];

// ── Delete confirm ────────────────────────────────────────────
function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Delete?</span>
      <button onClick={onConfirm} className="flex h-6 w-6 items-center justify-center rounded-md bg-destructive/10 hover:bg-destructive/20">
        <Check className="h-3 w-3 text-destructive" />
      </button>
      <button onClick={onCancel} className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary hover:bg-secondary/80">
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  );
}

// ── Category form modal ───────────────────────────────────────
interface CategoryFormModalProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  initial?: Category | null; books: Book[]; defaultBookId?: number;
  onSuccess: (cat: Category) => void;
}
const emptyForm = { name: '', kind: 'expense' as CategoryKind, icon: '🏠', color: '#003333', book_id: '' };

export function CategoryFormModal({ open, onOpenChange, initial, books, defaultBookId, onSuccess }: CategoryFormModalProps) {
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? '', kind: initial?.kind ?? 'expense',
        icon: initial?.icon ?? '🏠', color: initial?.color ?? '#003333',
        book_id: String(initial?.book_id ?? defaultBookId ?? books[0]?.id ?? ''),
      });
      setError('');
    }
  }, [open, initial, books, defaultBookId]);

  const set = (k: keyof typeof emptyForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true); setError('');
    const payload = {
      name: form.name.trim(), kind: form.kind,
      icon: form.icon || null, color: form.color || null,
      book_id: form.book_id ? parseInt(form.book_id) : null,
    };
    try {
      const res = initial
        ? await api.put<Category>(`/categories/${initial.id}`, payload)
        : await api.post<Category>('/categories/', payload);
      onSuccess(res.data);
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail : undefined;
      setError(typeof detail === 'string' ? detail : 'Failed to save category');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-border bg-secondary/30">
          <DialogHeader>
            <DialogTitle>{initial ? 'Edit category' : 'New category'}</DialogTitle>
            <DialogDescription>
              {initial ? 'Update this category.' : 'Categories help you tag transactions for reporting.'}
            </DialogDescription>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Type</Label>
            <div className="flex gap-2">
              {(['expense','income'] as CategoryKind[]).map(k => (
                <button key={k} type="button" onClick={() => set('kind', k)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
                    form.kind === k
                      ? k === 'income' ? 'border-accent-green bg-accent-green/10 text-accent-green' : 'border-primary bg-primary/8 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                  )}>
                  {k === 'income' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name <span className="text-destructive">*</span></Label>
            <Input id="cat-name" placeholder="e.g. Groceries, Utilities" required value={form.name}
              onChange={e => set('name', e.target.value)} className="rounded-xl" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Icon</Label>
            <div className="flex flex-wrap gap-1.5">
              {ICON_PRESETS.map(emoji => (
                <button key={emoji} type="button" onClick={() => set('icon', emoji)}
                  className={cn('h-9 w-9 rounded-xl text-lg flex items-center justify-center transition-all border',
                    form.icon === emoji ? 'border-primary bg-primary/10 scale-105' : 'border-border hover:bg-secondary')}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map(color => (
                <button key={color} type="button" onClick={() => set('color', color)}
                  className={cn('h-7 w-7 rounded-full border-2 transition-all',
                    form.color === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105')}
                  style={{ backgroundColor: color }} />
              ))}
              <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                className="h-7 w-7 rounded-full cursor-pointer border-0 p-0 bg-transparent" title="Custom" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-book">Book <span className="text-muted-foreground text-xs">(blank = global)</span></Label>
            <Select id="cat-book" value={form.book_id} onChange={e => set('book_id', e.target.value)} className="rounded-xl h-10">
              <option value="">Global (all books)</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/8 rounded-xl px-3 py-2">{error}</p>}
          <Button type="submit" disabled={saving || !form.name.trim()} className="w-full rounded-xl">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {initial ? 'Save changes' : 'Create category'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Spending bar chart ────────────────────────────────────────
interface SpendChartProps {
  categories: Category[];
  transactions: Transaction[];
  currency: string;
  monthStart: string;
  monthEnd: string;
  monthLabel: string;
}

const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card shadow-lg px-4 py-3 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">
        Spent: <span className="font-semibold text-foreground">{formatCurrency(payload[0].value, currency)}</span>
      </p>
    </div>
  );
};

function SpendingBarChart({ categories, transactions, currency, monthStart, monthEnd, monthLabel }: SpendChartProps) {
  const monthTx = transactions.filter(
    t => t.occurred_on >= monthStart && t.occurred_on <= monthEnd && t.kind === 'expense'
  );

  const data = useMemo(() => {
    const catMap = new Map(categories.map(c => [c.id, c]));
    const totals: Record<string, { name: string; icon: string; amount: number }> = {};
    for (const tx of monthTx) {
      const cat = tx.category_id ? catMap.get(tx.category_id) : null;
      const key = cat ? String(cat.id) : '__none__';
      if (!totals[key]) totals[key] = { name: cat?.name ?? 'Uncategorised', icon: cat?.icon ?? '🏷️', amount: 0 };
      totals[key].amount += tx.amount;
    }
    return Object.values(totals).sort((a, b) => b.amount - a.amount).slice(0, 12);
  }, [categories, monthTx]);

  const total = data.reduce((s, d) => s + d.amount, 0);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border p-8 text-center">
        <BarChart2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No expense transactions for {monthLabel} yet.</p>
      </div>
    );
  }

  const chartData = data.map(d => ({ name: `${d.icon} ${d.name}`, amount: d.amount }));

  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Spending by Category</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{monthLabel} · all expense categories</p>
        </div>
        <span className="text-xs font-semibold text-foreground tabular-nums bg-secondary px-2.5 py-1 rounded-lg">
          {formatCurrency(total, currency)}
        </span>
      </div>

      <div style={{ height: Math.max(240, data.length * 46) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 90, bottom: 0, left: 0 }} barSize={22}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e0eaea" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#6b8080' }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: '#0d1f1f' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: '#eaf1f0' }} />
            <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
              ))}
              <LabelList dataKey="amount" position="right"
                style={{ fontSize: 11, fill: '#6b8080', fontWeight: 600 }}
                formatter={(v: unknown) => formatCurrency(Number(v ?? 0), currency)} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {data.slice(0, 6).map((item, i) => {
          const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0;
          return (
            <div key={item.name} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
              <span className="text-xs text-muted-foreground truncate flex-1">{item.icon} {item.name}</span>
              <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function CategoriesPage() {
  const { books, activeBook } = useBook();
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [transactions,  setTransactions]  = useState<Transaction[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editTarget,    setEditTarget]    = useState<Category | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting,      setDeleting]      = useState<number | null>(null);
  const [filterKind,    setFilterKind]    = useState<CategoryKind | ''>('');
  const [activeTab,     setActiveTab]     = useState<'list' | 'chart'>('list');

  // Month picker for the chart
  const now = new Date();
  const [selMonth, setSelMonth] = useState<PickedMonth>({ year: now.getFullYear(), month: now.getMonth() });
  const maxMonth: PickedMonth   = { year: now.getFullYear(), month: now.getMonth() };
  const { start: mStart, end: mEnd, label: mLabel } = getMonthRangeFor(selMonth.year, selMonth.month);

  const primaryCurrency = 'USD';

  const fetchData = useCallback(async () => {
    try {
      const params = activeBook ? { book_id: activeBook.id } : {};
      const [catRes, txRes] = await Promise.all([
        api.get<Category[]>('/categories/', { params }),
        api.get<Transaction[]>('/transactions/', { params: { ...params, limit: 2000 } }),
      ]);
      setCategories(catRes.data);
      setTransactions(txRes.data);
    } catch { /* silent */ }
  }, [activeBook]);

  const load = useCallback(async () => { setIsLoading(true); await fetchData(); setIsLoading(false); }, [fetchData]);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try { await api.delete(`/categories/${id}`); await fetchData(); }
    finally { setDeleting(null); setConfirmDelete(null); }
  };

  const visible     = filterKind ? categories.filter(c => c.kind === filterKind) : categories;
  const incomeCount  = categories.filter(c => c.kind === 'income').length;
  const expenseCount = categories.filter(c => c.kind === 'expense').length;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Categories</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Tag transactions and track where money goes.</p>
        </div>
        <Button onClick={() => { setEditTarget(null); setModalOpen(true); }} className="rounded-xl gap-2 shrink-0 h-9 text-sm">
          <Plus className="h-4 w-4" />New category
        </Button>
      </div>

      {/* Stats row + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
          <Tag className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-foreground">{categories.length}</p>
          </div>
        </div>
        <div onClick={() => setFilterKind(filterKind === 'income' ? '' : 'income')}
          className={cn('rounded-xl border px-4 py-3 flex items-center gap-3 cursor-pointer transition-all',
            filterKind === 'income' ? 'border-accent-green bg-accent-green/8' : 'border-border bg-card hover:bg-secondary')}>
          <TrendingUp className="h-4 w-4 text-accent-green" />
          <div>
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-lg font-bold text-foreground">{incomeCount}</p>
          </div>
        </div>
        <div onClick={() => setFilterKind(filterKind === 'expense' ? '' : 'expense')}
          className={cn('rounded-xl border px-4 py-3 flex items-center gap-3 cursor-pointer transition-all',
            filterKind === 'expense' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-secondary')}>
          <TrendingDown className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Expense</p>
            <p className="text-lg font-bold text-foreground">{expenseCount}</p>
          </div>
        </div>

        <div className="ml-auto flex gap-1 bg-secondary rounded-xl p-1">
          {(['list','chart'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {tab === 'chart' ? <BarChart2 className="h-3.5 w-3.5" /> : <Tag className="h-3.5 w-3.5" />}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Chart month picker — only shown in chart tab */}
      {activeTab === 'chart' && (
        <div className="flex items-center gap-3">
          <MonthPicker value={selMonth} onChange={setSelMonth} maxMonth={maxMonth} />
          <p className="text-xs text-muted-foreground">Showing expenses for {mLabel}</p>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : activeTab === 'chart' ? (
        <SpendingBarChart
          categories={categories}
          transactions={transactions}
          currency={primaryCurrency}
          monthStart={mStart}
          monthEnd={mEnd}
          monthLabel={mLabel}
        />
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-14 text-center">
          <Tag className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground">No categories yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Add categories to tag your transactions.</p>
          <Button onClick={() => { setEditTarget(null); setModalOpen(true); }} variant="outline" className="rounded-xl gap-2">
            <Plus className="h-4 w-4" />Add first category
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {visible.map(cat => {
            const isDeleting = deleting === cat.id;
            const book = books.find(b => b.id === cat.book_id);
            return (
              <div key={cat.id} className={cn('group flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 transition-all hover:shadow-sm border-border', isDeleting && 'opacity-40')}>
                <div className="relative shrink-0">
                  <span className="text-xl">{cat.icon ?? '🏷️'}</span>
                  {cat.color && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-card" style={{ backgroundColor: cat.color }} />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                      cat.kind === 'income' ? 'bg-accent-green/10 text-accent-green' : 'bg-primary/10 text-primary')}>
                      {cat.kind}
                    </span>
                    {book && <span className="text-[10px] text-muted-foreground">{book.name}</span>}
                    {!cat.book_id && <span className="text-[10px] text-muted-foreground">Global</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                  {confirmDelete === cat.id ? (
                    <DeleteConfirm onConfirm={() => handleDelete(cat.id)} onCancel={() => setConfirmDelete(null)} />
                  ) : (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
                        onClick={() => { setEditTarget(cat); setModalOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
                        onClick={() => setConfirmDelete(cat.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <button onClick={() => { setEditTarget(null); setModalOpen(true); }}
            className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all">
            <Plus className="h-4 w-4" />New category
          </button>
        </div>
      )}

      <CategoryFormModal
        open={modalOpen} onOpenChange={setModalOpen}
        initial={editTarget} books={books} defaultBookId={activeBook?.id}
        onSuccess={async () => { await fetchData(); }}
      />
    </div>
  );
}
