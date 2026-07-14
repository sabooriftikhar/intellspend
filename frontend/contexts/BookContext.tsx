'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '@/lib/api';
import { Book } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

interface BookContextType {
  books: Book[];
  activeBook: Book | null;
  setActiveBookId: (id: number | null) => void;
  isLoading: boolean;
  refreshBooks: () => Promise<void>;
}

const BookContext = createContext<BookContextType | undefined>(undefined);

const STORAGE_KEY = 'intellspend_active_book';
const ALL_BOOKS_VALUE = 'all';

export function BookProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshBooks = useCallback(async () => {
    if (!user) {
      setBooks([]);
      setActiveBook(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.get<Book[]>('/books/');
      const fetched = response.data;
      setBooks(fetched);

      const storedId = localStorage.getItem(STORAGE_KEY);
      const selected = storedId === ALL_BOOKS_VALUE
        ? null
        : storedId
          ? fetched.find((b) => b.id === Number(storedId)) ?? fetched[0] ?? null
          : fetched[0] ?? null;
      setActiveBook(selected);
      if (selected) {
        localStorage.setItem(STORAGE_KEY, String(selected.id));
      } else if (fetched.length > 0) {
        localStorage.setItem(STORAGE_KEY, ALL_BOOKS_VALUE);
      }
    } catch (error) {
      console.error('Failed to fetch books', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshBooks();
    });
  }, [refreshBooks]);

  const setActiveBookId = (id: number | null) => {
    const book = id == null ? null : books.find((b) => b.id === id) ?? null;
    setActiveBook(book);
    if (book) {
      localStorage.setItem(STORAGE_KEY, String(book.id));
    } else if (books.length > 0) {
      localStorage.setItem(STORAGE_KEY, ALL_BOOKS_VALUE);
    }
  };

  return (
    <BookContext.Provider value={{ books, activeBook, setActiveBookId, isLoading, refreshBooks }}>
      {children}
    </BookContext.Provider>
  );
}

export function useBook() {
  const context = useContext(BookContext);
  if (context === undefined) {
    throw new Error('useBook must be used within a BookProvider');
  }
  return context;
}
