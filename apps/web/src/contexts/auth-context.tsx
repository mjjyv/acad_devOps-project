'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '@acad/contracts';
import { webAuth } from '../lib/auth-client.js';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: { login: string; password: string; deviceFingerprint?: string }) => Promise<void>;
  register: (data: { username: string; email: string; password: string; deviceFingerprint?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const profile = await webAuth.getCurrentUser();
      setUser(profile);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: { login: string; password: string; deviceFingerprint?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await webAuth.login(credentials);
      setUser(response.user);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập không thành công');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { username: string; email: string; password: string; deviceFingerprint?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await webAuth.register(data);
      setUser(response.user);
    } catch (err: any) {
      setError(err.message || 'Đăng ký không thành công');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await webAuth.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong một AuthProvider');
  }
  return context;
}
