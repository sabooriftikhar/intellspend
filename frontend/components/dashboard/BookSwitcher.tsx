'use client';

import { cn } from '@/lib/utils';
import { useBook } from '@/contexts/BookContext';
import { ChevronDown, BookOpen } from 'lucide-react';

export default function BookSwitcher({ className }: { className?: string }) {
  const { books, activeBook, setActiveBookId, isLoading } = useBook();

  if (isLoading) {
    return (
      <div className={cn('h-9 w-36 animate-pulse rounded-xl bg-secondary', className)} />
    );
  }

  if (books.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground',
          className
        )}
      >
        <BookOpen className="h-3.5 w-3.5 shrink-0" />
        No books yet
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <select
        value={activeBook?.id ?? ''}
        onChange={(e) => setActiveBookId(Number(e.target.value))}
        className="h-9 w-full appearance-none rounded-xl border border-border bg-card pl-8 pr-8 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 cursor-pointer"
      >
        {books.map((book) => (
          <option key={book.id} value={book.id}>
            {book.name}
          </option>
        ))}
      </select>
    </div>
  );
}
