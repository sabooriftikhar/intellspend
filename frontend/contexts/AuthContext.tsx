'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface User {
  id: number;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (data: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUserFromToken = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const response = await api.get('/users/me');
          setUser(response.data);
        } catch (error) {
          console.error('Failed to fetch user', error);
          localStorage.removeItem('access_token');
        }
      }
      setIsLoading(false);
    };
    loadUserFromToken();
  }, []);

  const login = async (data: { email: string; password: string }) => {
    // Backend /auth/login accepts { email, password } as JSON (UserCreate schema)
    const response = await api.post('/auth/login', {
      email: data.email,
      password: data.password,
    });
    localStorage.setItem('access_token', response.data.access_token);
    const userResponse = await api.get('/users/me');
    setUser(userResponse.data);
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
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
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
