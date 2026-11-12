'use client';

import { AuthRefreshRevokedError, HttpError } from '@acad/auth-client';
import type { LoginInput, RegisterInput, UserProfile } from '@acad/contracts';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import {
  getApiClient,
  resetApiClient,
  STORAGE_KEY_ACCESS_TOKEN,
  STORAGE_KEY_REFRESH_TOKEN,
} from '@/lib/api/client';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  authModalTitle?: string | undefined;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authModalTitle, setAuthModalTitle] = useState<string | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      if (typeof window === 'undefined') return;
      const hasRefreshToken = Boolean(localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN));
      const hasAccessToken = Boolean(localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN));

      if (!hasRefreshToken && !hasAccessToken) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const profile = await getApiClient().getMe();
        if (mounted) setUser(profile);
      } catch (err) {
        if (mounted) {
          // Chỉ xóa token cục bộ khi server thu hồi phiên thật (401/403).
          // Lỗi tạm thời 429 Too Many Requests / 503 không được hủy đăng nhập của user.
          if (
            err instanceof AuthRefreshRevokedError ||
            (err instanceof HttpError && (err.status === 401 || err.status === 403))
          ) {
            resetApiClient();
            setUser(null);
          }
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void initSession();
    return () => {
      mounted = false;
    };
  }, []);

  const persistAuthResult = useCallback(
    async (res: {
      user?: UserProfile | undefined;
      tokens?: { accessToken: string; refreshToken: string } | undefined;
    }) => {
      if (res.tokens && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, res.tokens.accessToken);
        localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, res.tokens.refreshToken);
      }
      if (res.user) {
        setUser(res.user);
      } else {
        const profile = await getApiClient().getMe();
        setUser(profile);
      }
      setIsAuthModalOpen(false);
      if (pendingAction) {
        try {
          pendingAction();
        } finally {
          setPendingAction(null);
        }
      }
    },
    [pendingAction],
  );

  const login = useCallback(
    async (payload: LoginInput) => {
      const res = await getApiClient().login({
        identifier: payload.identifier,
        password: payload.password,
        ...(payload.fingerprint ? { fingerprint: payload.fingerprint } : {}),
      });
      await persistAuthResult(res);
    },
    [persistAuthResult],
  );

  const register = useCallback(
    async (payload: RegisterInput) => {
      const res = await getApiClient().register({
        username: payload.username,
        email: payload.email,
        password: payload.password,
      });
      await persistAuthResult(res);
    },
    [persistAuthResult],
  );

  const logout = useCallback(async () => {
    try {
      await getApiClient().logout();
    } finally {
      resetApiClient();
      setUser(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await getApiClient().getMe();
      setUser(profile);
    } catch (err) {
      if (
        err instanceof AuthRefreshRevokedError ||
        (err instanceof HttpError && (err.status === 401 || err.status === 403))
      ) {
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
  }, []);

  const requireAuth = useCallback(
    (action: () => void, title?: string, mode: 'login' | 'register' = 'login') => {
      if (user) {
        action();
        return;
      }
      setPendingAction(() => action);
      openAuthModal(mode, title);
    },
    [user, openAuthModal],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
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

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
