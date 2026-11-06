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
    id: 'd0000000-0000-0000-0000-000000000002',
    spaceSlug: 'vozforums',
    spaceName: 's/vozforums',
    title:
      'Chia sẻ kinh nghiệm phỏng vấn DevOps Engineer và SRE tại các công ty Big Tech & Unicorn',
    timeAgo: '2d ago',
    upvotes: 428,
    comments: 3,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    spaceSlug: 'devops-arch',
    spaceName: 's/devops-arch',
    title:
      'Triển khai Self-Hosted Homelab Monorepo: Podman Rootless, Cloudflare Tunnel và Next.js 15 SSR High Availability',
    timeAgo: '3d ago',
    upvotes: 562,
    comments: 6,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=100&auto=format&fit=crop&q=60',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    spaceSlug: 'system-design',
    spaceName: 's/system-design',
    title:
      'Deep-dive PostgreSQL 16 ltree: Cấu trúc cây bình luận đệ quy tối ưu hóa cho hàng triệu nút',
    timeAgo: '1d ago',
    upvotes: 315,
    comments: 2,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=100&auto=format&fit=crop&q=60',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000004',
    spaceSlug: 'kubernetes',
    spaceName: 's/kubernetes',
    title: 'Chiến lược bộ đếm Karma và Vote FSM nguyên tử với Redis Lua Scripts',
    timeAgo: '18h ago',
    upvotes: 289,
    comments: 1,
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
          spaceName: post.spaceName || `s/${post.spaceSlug}`,
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
