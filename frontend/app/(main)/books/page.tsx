'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, BookOpen, Pencil, Trash2, Loader2, BookText, X, Check,
} from 'lucide-react';
import api from '@/lib/api';
import { Book } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useBook } from '@/contexts/BookContext';

// ── Small inline confirm ──────────────────────────────────────
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

// ── Book form modal ────────────────────────────────────────────
interface BookFormModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Book | null;
  onSuccess: () => void;
}

function BookFormModal({ open, onOpenChange, initial, onSuccess }: BookFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
      setError('');
    }
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (initial) {
        await api.put(`/books/${initial.id}`, { name: name.trim(), description: description.trim() || null });
      } else {
        await api.post('/books/', { name: name.trim(), description: description.trim() || null });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;
      setError(typeof detail === 'string' ? detail : 'Failed to save book');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit book' : 'New book'}</DialogTitle>
          <DialogDescription>
            {initial ? 'Update the book name or description.' : 'Books group your accounts and transactions — e.g. House, Personal, Sister.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <Label htmlFor="book-name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="book-name"
              placeholder="e.g. House, Personal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="book-desc">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="book-desc"
              placeholder="What's this book for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl"
            />
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/8 rounded-xl px-3 py-2">{error}</p>}
          <Button type="submit" disabled={saving || !name.trim()} className="w-full rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {initial ? 'Save changes' : 'Create book'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function BooksPage() {
  const { books, refreshBooks, setActiveBookId, activeBook } = useBook();
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Book | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    await refreshBooks();
    setIsLoading(false);
  }, [refreshBooks]);

  const handleEdit = (book: Book) => {
    setEditTarget(book);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await api.delete(`/books/${id}`);
      await refreshBooks();
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const bookColors = [
    'bg-primary text-primary-foreground',
    'bg-accent-green text-white',
    'bg-accent-yellow text-amber-900',
    'bg-accent-teal text-white',
    'bg-muted text-foreground',
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Books</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organise your finances into separate books — House, Personal, Family, etc.
          </p>
        </div>
        <Button onClick={handleCreate} className="rounded-xl gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          New book
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
          <BookOpen className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Total books</p>
            <p className="text-lg font-bold text-foreground">{books.length}</p>
          </div>
        </div>
        {activeBook && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
            <BookText className="h-4 w-4 text-accent-green" />
            <div>
              <p className="text-xs text-muted-foreground">Active book</p>
              <p className="text-sm font-semibold text-foreground">{activeBook.name}</p>
            </div>
          </div>
        )}
      </div>

      {/* Books grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : books.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground">No books yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Create your first book to start tracking your finances.
          </p>
          <Button onClick={handleCreate} variant="outline" className="rounded-xl gap-2">
            <Plus className="h-4 w-4" />
            Create book
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map((book, i) => {
            const colorClass = bookColors[i % bookColors.length];
            const isActive = activeBook?.id === book.id;
            const isDeleting = deleting === book.id;
            const confirmingDelete = confirmDelete === book.id;

            return (
              <div
                key={book.id}
                className={cn(
                  'rounded-2xl border bg-card p-5 flex flex-col gap-3 transition-all duration-200 hover:shadow-md group',
                  isActive ? 'border-primary ring-1 ring-primary/20' : 'border-border',
                  isDeleting && 'opacity-40'
                )}
              >
                {/* Icon + active badge */}
                <div className="flex items-start justify-between">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold', colorClass)}>
                    {book.name.slice(0, 2).toUpperCase()}
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>

                {/* Name & description */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{book.name}</p>
                  {book.description ? (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{book.description}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 mt-0.5 italic">No description</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-border/60">
                  <button
                    onClick={() => { setActiveBookId(book.id); }}
                    className={cn(
                      'text-xs font-medium transition-colors',
                      isActive ? 'text-primary cursor-default' : 'text-muted-foreground hover:text-primary'
                    )}
                    disabled={isActive}
                  >
                    {isActive ? '✓ Selected' : 'Set active'}
                  </button>

                  <div className="flex items-center gap-1">
                    {confirmingDelete ? (
                      <DeleteConfirm
                        onConfirm={() => handleDelete(book.id)}
                        onCancel={() => setConfirmDelete(null)}
                      />
                    ) : (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleEdit(book)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setConfirmDelete(book.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add card */}
          <button
            onClick={handleCreate}
            className="rounded-2xl border-2 border-dashed border-border bg-card p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all min-h-[140px]"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm font-medium">New book</span>
          </button>
        </div>
      )}

      <BookFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initial={editTarget}
        onSuccess={reload}
      />
    </div>
  );
}
