'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Receipt, Pencil, Trash2, Loader2, CheckCircle2,
  AlertCircle, Clock, Zap, RefreshCw, X, Check, Filter,
} from 'lucide-react';
import api from '@/lib/api';
import { Bill, Account, Category, Book } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useBook } from '@/contexts/BookContext';
import UpcomingBills from '@/components/dashboard/UpcomingBills';

// ── Days until helper ─────────────────────────────────────────
function getDaysUntil(dueDateStr?: string | null, dueDay?: number): number | null {
  if (dueDateStr) {
    const due = new Date(dueDateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    return Math.round((due.getTime() - today.getTime()) / 86400000);
  }
  if (dueDay) {
    const today = new Date(); today.setHours(0,0,0,0);
    let due = new Date(today.getFullYear(), today.getMonth(), dueDay);
    if (due < today) due = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
    return Math.round((due.getTime() - today.getTime()) / 86400000);
  }
  return null;
}

function urgencyBadge(days: number | null, status: string) {
  if (status === 'done') return { label: 'Paid', cls: 'bg-accent-green/10 text-accent-green', Icon: CheckCircle2 };
  if (days === null) return { label: 'Pending', cls: 'bg-secondary text-muted-foreground', Icon: Clock };
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, cls: 'bg-destructive/10 text-destructive', Icon: AlertCircle };
  if (days === 0) return { label: 'Due today', cls: 'bg-destructive/10 text-destructive', Icon: Zap };
  if (days <= 3) return { label: `${days}d left`, cls: 'bg-destructive/10 text-destructive', Icon: AlertCircle };
  if (days <= 7) return { label: `${days}d left`, cls: 'bg-accent-yellow/15 text-amber-700', Icon: Clock };
  return { label: `${days}d left`, cls: 'bg-secondary text-muted-foreground', Icon: Clock };
}

// ── Bill Form Modal ───────────────────────────────────────────
interface BillFormModalProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  initial?: Bill | null; books: Book[]; categories: Category[];
  defaultBookId?: number; onSuccess: () => void;
}

const emptyBillForm = {
  name: '', due_day_of_month: '', bill_month: '',
  estimated_amount: '', recurrence: 'monthly' as 'monthly' | 'once',
  book_id: '', category_id: '',
};

function BillFormModal({ open, onOpenChange, initial, books, categories, defaultBookId, onSuccess }: BillFormModalProps) {
  const [form, setForm] = useState({ ...emptyBillForm });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const today = new Date();
      const defaultMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
      setForm({
        name: initial?.name ?? '',
        due_day_of_month: String(initial?.due_day_of_month ?? ''),
        bill_month: initial?.bill_month ?? defaultMonth,
        estimated_amount: String(initial?.estimated_amount ?? ''),
        recurrence: initial?.recurrence ?? 'monthly',
        book_id: String(initial?.book_id ?? defaultBookId ?? books[0]?.id ?? ''),
        category_id: String(initial?.category_id ?? ''),
      });
      setError('');
    }
  }, [open, initial, books, defaultBookId]);

  const set = (k: keyof typeof emptyBillForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.due_day_of_month || !form.estimated_amount || !form.book_id) return;
    setSaving(true); setError('');
    const dueDay = parseInt(form.due_day_of_month);
    const [y, m] = form.bill_month ? form.bill_month.split('-').map(Number) : [0, 0];
    const dueDate = y && m ? `${y}-${String(m).padStart(2,'0')}-${String(Math.min(dueDay,28)).padStart(2,'0')}` : null;
    const payload = {
      name: form.name.trim(),
      due_day_of_month: dueDay,
      due_date: dueDate,
      bill_month: form.bill_month || null,
      estimated_amount: parseFloat(form.estimated_amount),
      recurrence: form.recurrence,
      book_id: parseInt(form.book_id),
      category_id: form.category_id ? parseInt(form.category_id) : null,
    };
    try {
      if (initial) { await api.put(`/bills/${initial.id}`, payload); }
      else { await api.post('/bills/', payload); }
      onSuccess(); onOpenChange(false);
    } catch (err: unknown) {
      const detail = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail : undefined;
      setError(typeof detail === 'string' ? detail : 'Failed to save bill');
    } finally { setSaving(false); }
  };

  const expenseCategories = categories.filter(c => c.kind === 'expense');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-border bg-secondary/30">
          <DialogHeader>
            <DialogTitle>{initial ? 'Edit bill' : 'Add bill'}</DialogTitle>
            <DialogDescription>
              {initial ? 'Update this bill.' : 'Add a recurring or one-time bill reminder.'}
            </DialogDescription>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="b-name">Bill name <span className="text-destructive">*</span></Label>
            <Input id="b-name" placeholder="e.g. Electricity, Gas, Internet" required value={form.name}
              onChange={e => set('name', e.target.value)} className="rounded-xl" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="b-day">Due day (1–31) <span className="text-destructive">*</span></Label>
              <Input id="b-day" type="number" min="1" max="31" required placeholder="e.g. 24"
                value={form.due_day_of_month} onChange={e => set('due_day_of_month', e.target.value)}
                className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-month">Bill month</Label>
              <Input id="b-month" type="month" value={form.bill_month}
                onChange={e => set('bill_month', e.target.value)} className="rounded-xl h-10" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="b-amount">Estimated amount <span className="text-destructive">*</span></Label>
              <Input id="b-amount" type="number" step="0.01" min="0.01" required placeholder="0.00"
                value={form.estimated_amount} onChange={e => set('estimated_amount', e.target.value)}
                className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-rec">Recurrence</Label>
              <Select id="b-rec" value={form.recurrence} onChange={e => set('recurrence', e.target.value as 'monthly'|'once')}
                className="rounded-xl h-10">
                <option value="monthly">Monthly</option>
                <option value="once">One-time</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="b-book">Book <span className="text-destructive">*</span></Label>
              <Select id="b-book" required value={form.book_id} onChange={e => set('book_id', e.target.value)}
                className="rounded-xl h-10">
                <option value="">Select book</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-cat">Category <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select id="b-cat" value={form.category_id} onChange={e => set('category_id', e.target.value)}
                className="rounded-xl h-10">
                <option value="">None</option>
                {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/8 rounded-xl px-3 py-2">{error}</p>}
          <Button type="submit" disabled={saving || !form.name.trim() || !form.book_id} className="w-full rounded-xl">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {initial ? 'Save changes' : 'Add bill'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function BillsPage() {
  const { books, activeBook } = useBook();
  const [bills, setBills] = useState<Bill[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Bill | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'done'>('all');

  const fetchAll = useCallback(async () => {
    try {
      const params = activeBook ? { book_id: activeBook.id } : {};
      const [billsRes, accRes, catRes] = await Promise.all([
        api.get<Bill[]>('/bills/', { params }),
        api.get<Account[]>('/accounts/', { params }),
        api.get<Category[]>('/categories/', { params }),
      ]);
      setBills(billsRes.data);
      setAccounts(accRes.data);
      setCategories(catRes.data);
    } catch { setBills([]); }
  }, [activeBook]);

  const load = useCallback(async () => { setIsLoading(true); await fetchAll(); setIsLoading(false); }, [fetchAll]);
  const refresh = useCallback(async () => { setIsRefreshing(true); await fetchAll(); setIsRefreshing(false); }, [fetchAll]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try { await api.delete(`/bills/${id}`); await fetchAll(); }
    finally { setDeleting(null); setConfirmDelete(null); }
  };

  const visible = bills.filter(b => filterStatus === 'all' ? true : b.status === filterStatus);
  const pendingCount = bills.filter(b => b.status === 'pending').length;
  const doneCount = bills.filter(b => b.status === 'done').length;
  const totalPending = bills.filter(b => b.status === 'pending').reduce((s, b) => s + b.estimated_amount, 0);

  const categoryMap = new Map(categories.map(c => [c.id, c]));

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Bills</h1>
          <p className="text-sm text-muted-foreground mt-1">Track recurring & one-time bill reminders.</p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing} className="rounded-xl gap-2">
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />Refresh
          </Button>
          <Button onClick={() => { setEditTarget(null); setModalOpen(true); }} className="rounded-xl gap-2">
            <Plus className="h-4 w-4" />Add bill
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Pending', val: pendingCount, sub: formatCurrency(totalPending,'USD'), cls:'text-foreground', onClick: () => setFilterStatus('pending') },
          { label: 'Paid this cycle', val: doneCount, sub: '', cls:'text-accent-green', onClick: () => setFilterStatus('done') },
          { label: 'Total bills', val: bills.length, sub: '', cls:'text-foreground', onClick: () => setFilterStatus('all') },
        ].map(s => (
          <button key={s.label} onClick={s.onClick}
            className={cn('rounded-xl border bg-card px-4 py-3 flex items-center gap-3 hover:bg-secondary transition-colors',
              filterStatus === (s.label==='Total bills'?'all':s.label==='Pending'?'pending':'done') ? 'border-primary ring-1 ring-primary/20':'border-border')}>
            <Receipt className="h-4 w-4 text-primary" />
            <div className="text-left">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn('text-lg font-bold', s.cls)}>{s.val}</p>
              {s.sub && <p className="text-xs text-muted-foreground">{s.sub} due</p>}
            </div>
          </button>
        ))}
      </div>

      {/* Upcoming widget (pending only) */}
      {pendingCount > 0 && (
        <UpcomingBills bills={bills} accounts={accounts} onRefresh={refresh} showAll />
      )}

      {/* Full table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-14 text-center">
          <Receipt className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground">No bills yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Add your first bill — electricity, gas, fees, etc.</p>
          <Button onClick={() => { setEditTarget(null); setModalOpen(true); }} variant="outline" className="rounded-xl gap-2">
            <Plus className="h-4 w-4" />Add bill
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">All Bills</h3>
            <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
              {(['all','pending','done'] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={cn('px-3 py-1 rounded-md text-xs font-medium transition-all capitalize',
                    filterStatus===s ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-border">
            {visible.map(bill => {
              const days = getDaysUntil(bill.due_date, bill.due_day_of_month);
              const badge = urgencyBadge(days, bill.status);
              const BadgeIcon = badge.Icon;
              const cat = bill.category_id ? categoryMap.get(bill.category_id) : null;
              const isDeleting = deleting === bill.id;
              return (
                <div key={bill.id} className={cn('flex items-center gap-4 px-5 py-4 hover:bg-secondary/30 transition-colors group', isDeleting && 'opacity-40')}>
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl shrink-0', badge.cls.includes('green') ? 'bg-accent-green/10' : badge.cls.includes('destructive') || badge.cls.includes('amber') ? 'bg-destructive/8' : 'bg-secondary')}>
                    <BadgeIcon className={cn('h-4 w-4', badge.cls.split(' ')[1])} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{bill.name}</p>
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', badge.cls)}>{badge.label}</span>
                      <span className="text-[10px] font-medium text-muted-foreground capitalize bg-secondary px-1.5 py-0.5 rounded-full">{bill.recurrence}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">Due {bill.due_day_of_month}th</span>
                      {bill.bill_month && <span className="text-xs text-muted-foreground">{bill.bill_month}</span>}
                      {cat && <span className="text-xs text-muted-foreground">{cat.icon} {cat.name}</span>}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-foreground tabular-nums shrink-0">{formatCurrency(bill.estimated_amount,'USD')}</p>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
                      onClick={() => { setEditTarget(bill); setModalOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    {confirmDelete === bill.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(bill.id)} className="flex h-6 w-6 items-center justify-center rounded-md bg-destructive/10 hover:bg-destructive/20">
                          <Check className="h-3 w-3 text-destructive" />
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary">
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
                        onClick={() => setConfirmDelete(bill.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <BillFormModal open={modalOpen} onOpenChange={setModalOpen} initial={editTarget}
        books={books} categories={categories} defaultBookId={activeBook?.id} onSuccess={load} />
    </div>
  );
}
