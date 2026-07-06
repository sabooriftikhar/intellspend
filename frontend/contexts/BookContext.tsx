'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '@/lib/api';
import { Book } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

interface BookContextType {
  books: Book[];
  activeBook: Book | null;
  setActiveBookId: (id: number) => void;
  isLoading: boolean;
  refreshBooks: () => Promise<void>;
}

const BookContext = createContext<BookContextType | undefined>(undefined);

const STORAGE_KEY = 'intellspend_active_book';

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
      const storedBook = storedId ? fetched.find((b) => b.id === Number(storedId)) : null;
      const selected = storedBook ?? fetched[0] ?? null;
      setActiveBook(selected);
      if (selected) {
        localStorage.setItem(STORAGE_KEY, String(selected.id));
      }
    } catch (error) {
      console.error('Failed to fetch books', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshBooks();
  }, [refreshBooks]);

  const setActiveBookId = (id: number) => {
    const book = books.find((b) => b.id === id) ?? null;
    setActiveBook(book);
    if (book) {
      localStorage.setItem(STORAGE_KEY, String(book.id));
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
