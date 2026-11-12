'use client';

import type { SortMode } from '@acad/contracts';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';
export type FeedTabMode = 'following' | 'for_you';
export type ChatWidgetState = 'closed' | 'minimized' | 'docked';

export interface ToastMessage {
  id: string;
  text: string;
  tone?: 'info' | 'success' | 'error';
}

interface UIContextValue {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  activeFeedTab: FeedTabMode;
  setActiveFeedTab: (tab: FeedTabMode) => void;
  feedSort: SortMode;
  setFeedSort: (sort: SortMode) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  chatWidgetState: ChatWidgetState;
  setChatWidgetState: (state: ChatWidgetState) => void;
  toasts: ToastMessage[];
  showToast: (text: string, tone?: ToastMessage['tone']) => void;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);
const THEME_STORAGE_KEY = 'acad_theme_mode';

export function UIProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [activeFeedTab, setActiveFeedTab] = useState<FeedTabMode>('for_you');
  const [feedSort, setFeedSort] = useState<SortMode>('hot');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatWidgetState, setChatWidgetState] = useState<ChatWidgetState>('closed');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const initial: ThemeMode = saved === 'light' ? 'light' : 'dark';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem(THEME_STORAGE_KEY, next);
        document.documentElement.setAttribute('data-theme', next);
      }
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const showToast = useCallback((text: string, tone: ToastMessage['tone'] = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <UIContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        setSidebarOpen,
        theme,
        toggleTheme,
        activeFeedTab,
        setActiveFeedTab,
        feedSort,
        setFeedSort,
        searchQuery,
        setSearchQuery,
        chatWidgetState,
        setChatWidgetState,
        toasts,
        showToast,
      }}
    >
      {children}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '72px',
            right: '20px',
            zIndex: 90,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface)',
                border:
                  toast.tone === 'error'
                    ? '1px solid var(--color-danger)'
                    : toast.tone === 'success'
                      ? '1px solid var(--color-success)'
                      : '1px solid var(--border-strong)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-dropdown)',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {toast.text}
            </div>
          ))}
        </div>
      )}
    </UIContext.Provider>
  );
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) {
    throw new Error('useUI must be used within UIProvider');
  }
  return ctx;
}
