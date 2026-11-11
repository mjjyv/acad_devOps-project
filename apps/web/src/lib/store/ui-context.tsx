'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface RecentPostItem {
  id: string;
  spaceSlug: string;
  spaceName: string;
  spaceAvatar?: string;
  title: string;
  timeAgo: string;
  upvotes: number;
  comments: number;
  thumbnailUrl?: string;
}

export type FeedTab = 'for_you' | 'following';
export type FeedSort = 'hot' | 'new' | 'top' | 'best';
export type ViewMode = 'card' | 'compact';
export type ChatWidgetState = 'minimized' | 'docked' | 'closed';

interface UIContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  chatWidgetState: ChatWidgetState;
  setChatWidgetState: (state: ChatWidgetState) => void;
  activeFeedTab: FeedTab;
  setActiveFeedTab: (tab: FeedTab) => void;
  feedSort: FeedSort;
  setFeedSort: (sort: FeedSort) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  recentPosts: RecentPostItem[];
  addRecentPost: (post: Omit<RecentPostItem, 'timeAgo'> & { timeAgo?: string }) => void;
  clearRecentPosts: () => void;
  toastMessage: string | null;
  showToast: (message: string) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

const STORAGE_KEY_RECENT_POSTS = 'acad_recent_posts_v1';

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatWidgetState, setChatWidgetState] = useState<ChatWidgetState>('minimized');
  const [activeFeedTab, setActiveFeedTab] = useState<FeedTab>('for_you');
  const [feedSort, setFeedSort] = useState<FeedSort>('hot');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentPosts, setRecentPosts] = useState<RecentPostItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RECENT_POSTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentPosts(parsed.slice(0, 5));
        }
      }
    } catch {
      // Ignore malformed local storage
    }
  }, []);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const clearRecentPosts = () => {
    setRecentPosts([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_RECENT_POSTS);
    }
  };

  const addRecentPost = useCallback(
    (post: Omit<RecentPostItem, 'timeAgo'> & { timeAgo?: string }) => {
      setRecentPosts((prev) => {
        const filtered = prev.filter((p) => p.id !== post.id);
        const next = [
          {
            ...post,
            timeAgo: post.timeAgo || 'Vừa xong',
            spaceName:
              post.spaceName && post.spaceName !== 's/'
                ? post.spaceName
                : `s/${post.spaceSlug || 'devops-arch'}`,
          },
          ...filtered,
        ].slice(0, 5);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_RECENT_POSTS, JSON.stringify(next));
        }
        return next;
      });
    },
    [],
  );

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Keyboard shortcut listener ('/' to focus search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <UIContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        setSidebarOpen,
        chatWidgetState,
        setChatWidgetState,
        activeFeedTab,
        setActiveFeedTab,
        feedSort,
        setFeedSort,
        viewMode,
        setViewMode,
        searchQuery,
        setSearchQuery,
        recentPosts,
        addRecentPost,
        clearRecentPosts,
        toastMessage,
        showToast,
      }}
    >
      {children}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1a1a1b',
            color: '#f2f4f5',
            border: '1px solid #3e3e40',
            borderRadius: '9999px',
            padding: '10px 20px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
            zIndex: 9999,
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ color: '#ff4500' }}>✓</span> {toastMessage}
        </div>
      )}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

export const useUIState = useUI;
