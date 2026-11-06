'use client';

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

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

const INITIAL_RECENT_POSTS: RecentPostItem[] = [
  {
    id: 'post-1',
    spaceSlug: 'vozforums',
    spaceName: 'r/vozforums',
    title: 'Ông chú Vịt teo tham vọng đá bay Zàlò ra chuồng gà',
    timeAgo: '14h ago',
    upvotes: 63,
    comments: 40,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60',
  },
  {
    id: 'post-2',
    spaceSlug: 'devops-arch',
    spaceName: 'r/devops-arch',
    title: 'Triển khai Zero-Downtime Rolling Update trên Podman & Systemd Homelab',
    timeAgo: '1d ago',
    upvotes: 128,
    comments: 32,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=100&auto=format&fit=crop&q=60',
  },
  {
    id: 'post-3',
    spaceSlug: 'vietnam',
    spaceName: 'r/VietNam',
    title: 'Hạ tầng cáp quang biển và giải pháp Cloudflare Tunnel vượt lũ băng thông',
    timeAgo: '2d ago',
    upvotes: 448,
    comments: 281,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=100&auto=format&fit=crop&q=60',
  },
  {
    id: 'post-4',
    spaceSlug: 'database',
    spaceName: 'r/database',
    title: 'Tối ưu hóa PostgreSQL ltree Base36 index GiST cho diễn đàn 10 triệu comment',
    timeAgo: '3d ago',
    upvotes: 312,
    comments: 94,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=100&auto=format&fit=crop&q=60',
  },
];

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatWidgetState, setChatWidgetState] = useState<ChatWidgetState>('minimized');
  const [activeFeedTab, setActiveFeedTab] = useState<FeedTab>('for_you');
  const [feedSort, setFeedSort] = useState<FeedSort>('hot');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentPosts, setRecentPosts] = useState<RecentPostItem[]>(INITIAL_RECENT_POSTS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const clearRecentPosts = () => setRecentPosts([]);

  const addRecentPost = (post: Omit<RecentPostItem, 'timeAgo'> & { timeAgo?: string }) => {
    setRecentPosts((prev) => {
      const filtered = prev.filter((p) => p.id !== post.id);
      return [
        {
          ...post,
          timeAgo: post.timeAgo || 'Just now',
          spaceName: post.spaceName || `r/${post.spaceSlug}`,
        },
        ...filtered,
      ].slice(0, 5);
    });
  };

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
