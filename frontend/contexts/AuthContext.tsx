'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setSessionExpiredHandler } from '@/lib/session';

interface User {
  id: number;
  email: string;
  name?: string | null;
  created_at?: string | null;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User) => void;
  login: (data: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  sessionMessage: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setSessionExpiredHandler((message) => {
      setUser(null);
      setIsLoading(false);
      setSessionMessage(message);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
      router.replace('/login');
      window.setTimeout(() => setSessionMessage(null), 5000);
    });

    const loadUserFromToken = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const response = await api.get('/users/me');
          setUser(response.data);
        } catch (error) {
          console.error('Failed to fetch user', error);
        }
      }
      setIsLoading(false);
    };
    loadUserFromToken();

    return () => setSessionExpiredHandler(null);
  }, []);

  const login = async (data: { email: string; password: string }) => {
    // Backend /auth/login accepts { email, password } as JSON (UserCreate schema)
    const response = await api.post('/auth/login', {
      email: data.email,
      password: data.password,
    });
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
    const userResponse = await api.get('/users/me');
    setUser(userResponse.data);
    setSessionMessage(null);
    router.push('/dashboard');
  };

  const register = async (data: { email: string; password: string }) => {
    // POST /auth/register creates the user, then we log in
    await api.post('/auth/register', {
      email: data.email,
      password: data.password,
    });
    // Auto-login after registration
    await login({ email: data.email, password: data.password });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setSessionMessage(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, isLoading, sessionMessage }}>
      {children}
      {sessionMessage && (
        <div className="fixed right-4 top-4 z-50 max-w-sm rounded-2xl border border-border bg-card px-4 py-3 shadow-xl">
          <p className="text-sm font-medium text-foreground">{sessionMessage}</p>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
