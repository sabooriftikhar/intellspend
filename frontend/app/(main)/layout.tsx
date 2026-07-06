import React from 'react';
import Sidebar from '@/components/sidebar';
import AuthGuard from '@/components/AuthGuard';
import { BookProvider } from '@/contexts/BookContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <BookProvider>
        <PreferencesProvider>
          <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
              {children}
            </main>
          </div>
        </PreferencesProvider>
      </BookProvider>
    </AuthGuard>
  );
}
