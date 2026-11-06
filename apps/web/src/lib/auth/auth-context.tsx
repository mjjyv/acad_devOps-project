'use client';

import { HttpError } from '@acad/auth-client';
import type { LoginInput, RegisterInput, UserProfile } from '@acad/contracts';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { getApiClient, resetApiClient, STORAGE_KEY_REFRESH_TOKEN } from '@/lib/api/client';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  authModalTitle?: string;
  login: (payload: LoginInput) => Promise<void>;
  register: (payload: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  openAuthModal: (mode?: 'login' | 'register', title?: string) => void;
  closeAuthModal: () => void;
  requireAuth: (action: () => void, title?: string, mode?: 'login' | 'register') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authModalTitle, setAuthModalTitle] = useState<string | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Initialize session from stored token on mount
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      if (typeof window === 'undefined') return;
      const hasRefreshToken = !!localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN);

      if (!hasRefreshToken) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const client = getApiClient();
        const profile = await client.getMe();
        if (mounted) {
          setUser(profile);
        }
      } catch (_err) {
        // Session invalid or expired
        if (mounted) {
          resetApiClient();
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(
    async (payload: LoginInput) => {
      const client = getApiClient();
      const res = await client.login({
        identifier: payload.identifier,
        password: payload.password,
      });

      if (res.user) {
        setUser(res.user);
      } else {
        const profile = await client.getMe();
        setUser(profile);
      }

      setIsAuthModalOpen(false);

      if (pendingAction) {
        try {
          pendingAction();
        } catch {
          // ignore callback error
        }
        setPendingAction(null);
      }
    },
    [pendingAction],
  );

  const register = useCallback(
    async (payload: RegisterInput) => {
      const client = getApiClient();
      const res = await client.register({
        username: payload.username,
        email: payload.email,
        password: payload.password,
      });

      if (res.user) {
        setUser(res.user);
      } else {
        const profile = await client.getMe();
        setUser(profile);
      }

      setIsAuthModalOpen(false);

      if (pendingAction) {
        try {
          pendingAction();
        } catch {
          // ignore callback error
        }
        setPendingAction(null);
      }
    },
    [pendingAction],
  );

  const logout = useCallback(async () => {
    try {
      const client = getApiClient();
      await client.logout();
    } catch {
      // ignore network errors on logout
    } finally {
      resetApiClient();
      setUser(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const client = getApiClient();
      const profile = await client.getMe();
      setUser(profile);
    } catch (err) {
      if (err instanceof HttpError && err.status === 401) {
        resetApiClient();
        setUser(null);
      }
    }
  }, []);

  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login', title?: string) => {
    setAuthModalMode(mode);
    setAuthModalTitle(title);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setPendingAction(null);
    setAuthModalTitle(undefined);
  }, []);

  const requireAuth = useCallback(
    (action: () => void, title?: string, mode: 'login' | 'register' = 'login') => {
      if (user) {
        action();
      } else {
        setPendingAction(() => action);
        openAuthModal(mode, title);
      }
    },
    [user, openAuthModal],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAuthModalOpen,
        authModalMode,
        authModalTitle,
        login,
        register,
        logout,
        refreshProfile,
        openAuthModal,
        closeAuthModal,
        requireAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
