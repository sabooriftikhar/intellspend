'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Tag, Pencil, Trash2, Loader2, X, Check, TrendingUp, TrendingDown,
} from 'lucide-react';
import api from '@/lib/api';
import { Category, CategoryKind, Book } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useBook } from '@/contexts/BookContext';

// ── Emoji/icon picker presets ───────────────────────────────────
const ICON_PRESETS = ['🏠', '🛒', '💡', '🚗', '🍔', '💊', '📚', '👗', '💰', '🎯', '📱', '✈️', '🏋️', '🎬', '☕', '🔧', '💳', '🏦', '💼', '🎁'];
const COLOR_PRESETS = ['#003333', '#00c853', '#ffca28', '#e53935', '#1976d2', '#7b1fa2', '#f57c00', '#0097a7', '#5d4037', '#455a64'];

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

// ── Category form modal ────────────────────────────────────────
interface CategoryFormModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Category | null;
  books: Book[];
  defaultBookId?: number;
  onSuccess: (cat: Category) => void;
}

const emptyForm = {
  name: '',
  kind: 'expense' as CategoryKind,
  icon: '🏠',
  color: '#003333',
  book_id: '',
};

export function CategoryFormModal({
  open, onOpenChange, initial, books, defaultBookId, onSuccess,
}: CategoryFormModalProps) {
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? '',
        kind: initial?.kind ?? 'expense',
        icon: initial?.icon ?? '🏠',
        color: initial?.color ?? '#003333',
        book_id: String(initial?.book_id ?? defaultBookId ?? books[0]?.id ?? ''),
      });
      setError('');
    }
  }, [open, initial, books, defaultBookId]);

  const set = (key: keyof typeof emptyForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      icon: form.icon || null,
      color: form.color || null,
      book_id: form.book_id ? parseInt(form.book_id) : null,
    };
    try {
      let result: Category;
      if (initial) {
        const res = await api.put<Category>(`/categories/${initial.id}`, payload);
        result = res.data;
      } else {
        const res = await api.post<Category>('/categories/', payload);
        result = res.data;
      }
      onSuccess(result);
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;
      setError(typeof detail === 'string' ? detail : 'Failed to save category');
    } finally {
      setSaving(false);
    }
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
          {/* Kind toggle */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Type</Label>
            <div className="flex gap-2">
              {(['expense', 'income'] as CategoryKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set('kind', k)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
                    form.kind === k
                      ? k === 'income'
                        ? 'border-accent-green bg-accent-green/10 text-accent-green'
                        : 'border-primary bg-primary/8 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                  )}
                >
                  {k === 'income' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name <span className="text-destructive">*</span></Label>
            <Input id="cat-name" placeholder="e.g. Groceries, Utilities" required value={form.name}
              onChange={(e) => set('name', e.target.value)} className="rounded-xl" autoFocus />
          </div>

          {/* Icon picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Icon</Label>
            <div className="flex flex-wrap gap-1.5">
              {ICON_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => set('icon', emoji)}
                  className={cn(
                    'h-9 w-9 rounded-xl text-lg flex items-center justify-center transition-all border',
                    form.icon === emoji ? 'border-primary bg-primary/10 scale-105' : 'border-border hover:bg-secondary'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => set('color', color)}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition-all',
                    form.color === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={(e) => set('color', e.target.value)}
                className="h-7 w-7 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                title="Custom color"
              />
            </div>
          </div>

          {/* Book (optional — null means global) */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-book">
              Book <span className="text-muted-foreground text-xs">(leave blank for global)</span>
            </Label>
            <Select id="cat-book" value={form.book_id}
              onChange={(e) => set('book_id', e.target.value)} className="rounded-xl h-10">
              <option value="">Global (all books)</option>
              {books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
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

// ── Main page ──────────────────────────────────────────────────
export default function CategoriesPage() {
  const { books, activeBook } = useBook();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [filterKind, setFilterKind] = useState<CategoryKind | ''>('');

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get<Category[]>('/categories/', {
        params: activeBook ? { book_id: activeBook.id } : {},
      });
      setCategories(res.data);
    } catch {
      setCategories([]);
    }
  }, [activeBook]);

  const load = useCallback(async () => {
    setIsLoading(true);
    await fetchCategories();
    setIsLoading(false);
  }, [fetchCategories]);

  useEffect(() => { load(); }, [load]);

  const handleEdit = (cat: Category) => { setEditTarget(cat); setModalOpen(true); };
  const handleCreate = () => { setEditTarget(null); setModalOpen(true); };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await api.delete(`/categories/${id}`);
      await fetchCategories();
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const handleSuccess = async () => { await fetchCategories(); };

  const visible = filterKind ? categories.filter((c) => c.kind === filterKind) : categories;
  const incomeCount = categories.filter((c) => c.kind === 'income').length;
  const expenseCount = categories.filter((c) => c.kind === 'expense').length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tag your transactions to see where money goes.
          </p>
        </div>
        <Button onClick={handleCreate} className="rounded-xl gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          New category
        </Button>
      </div>

      {/* Stats + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
          <Tag className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-foreground">{categories.length}</p>
          </div>
        </div>
        <div
          onClick={() => setFilterKind(filterKind === 'income' ? '' : 'income')}
          className={cn(
            'rounded-xl border px-4 py-3 flex items-center gap-3 cursor-pointer transition-all',
            filterKind === 'income' ? 'border-accent-green bg-accent-green/8' : 'border-border bg-card hover:bg-secondary'
          )}
        >
          <TrendingUp className="h-4 w-4 text-accent-green" />
          <div>
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-lg font-bold text-foreground">{incomeCount}</p>
          </div>
        </div>
        <div
          onClick={() => setFilterKind(filterKind === 'expense' ? '' : 'expense')}
          className={cn(
            'rounded-xl border px-4 py-3 flex items-center gap-3 cursor-pointer transition-all',
            filterKind === 'expense' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-secondary'
          )}
        >
          <TrendingDown className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Expense</p>
            <p className="text-lg font-bold text-foreground">{expenseCount}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
          <Tag className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground">No categories yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add categories to tag and track your transactions.
          </p>
          <Button onClick={handleCreate} variant="outline" className="rounded-xl gap-2">
            <Plus className="h-4 w-4" />
            Add first category
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {visible.map((cat) => {
            const isDeleting = deleting === cat.id;
            const confirmingDelete = confirmDelete === cat.id;
            const book = books.find((b) => b.id === cat.book_id);

            return (
              <div
                key={cat.id}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 transition-all hover:shadow-sm',
                  isDeleting && 'opacity-40',
                  'border-border'
                )}
              >
                {/* Icon with color dot */}
                <div className="relative shrink-0">
                  <span className="text-xl">{cat.icon ?? '🏷️'}</span>
                  {cat.color && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-card"
                      style={{ backgroundColor: cat.color }}
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                      cat.kind === 'income' ? 'bg-accent-green/10 text-accent-green' : 'bg-primary/10 text-primary'
                    )}>
                      {cat.kind}
                    </span>
                    {book && <span className="text-[10px] text-muted-foreground">{book.name}</span>}
                    {!cat.book_id && <span className="text-[10px] text-muted-foreground">Global</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                  {confirmingDelete ? (
                    <DeleteConfirm
                      onConfirm={() => handleDelete(cat.id)}
                      onCancel={() => setConfirmDelete(null)}
                    />
                  ) : (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
                        onClick={() => handleEdit(cat)}>
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

          {/* Add pill */}
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Plus className="h-4 w-4" />
            New category
          </button>
        </div>
      )}

      <CategoryFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initial={editTarget}
        books={books}
        defaultBookId={activeBook?.id}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
