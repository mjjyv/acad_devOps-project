'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useChat } from '@/lib/chat/chat-context';
import { useUI } from '@/lib/store/ui-context';
import { SessionsModal } from '../auth/sessions-modal';
import { UserMenuDropdown } from '../auth/user-menu-dropdown';
import {
  ChatBubbleIcon,
  MenuIcon,
  MoonIcon,
  PlusIcon,
  SearchIcon,
  SunIcon,
  SynapseLogo,
} from '../ui/icons';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const {
    toggleSidebar,
    theme,
    toggleTheme,
    searchQuery,
    setSearchQuery,
    chatWidgetState,
    setChatWidgetState,
  } = useUI();
  const { isAuthenticated, openAuthModal } = useAuth();
  const { unreadTotal } = useChat();
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    router.push(trimmed ? `/?tab=for_you&q=${encodeURIComponent(trimmed)}` : '/?tab=for_you');
  };

  const handleChatClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      openAuthModal('login');
      return;
    }
    // Desktop: toggle docked widget if not already on /chat
    if (
      typeof window !== 'undefined' &&
      window.innerWidth >= 768 &&
      !pathname.startsWith('/chat')
    ) {
      e.preventDefault();
      setChatWidgetState(chatWidgetState === 'docked' ? 'closed' : 'docked');
    }
  };

  return (
    <>
      <header className="header-sticky">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Mở/đóng thanh điều hướng"
            className="btn-ghost"
            style={{ padding: '6px 8px', border: 'none' }}
          >
            <MenuIcon size={20} />
          </button>

          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
            }}
          >
            <SynapseLogo size={30} />
            <span
              style={{
                fontSize: '17px',
                fontWeight: 900,
                letterSpacing: '0.05em',
                color: 'var(--text-primary)',
              }}
            >
              SYNAPSE
            </span>
          </Link>
        </div>

        <form
          onSubmit={handleSearch}
          style={{
            flex: 1,
            maxWidth: '460px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <SearchIcon
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm bài viết hoặc nhấn / ..."
            className="input-field"
            style={{
              paddingLeft: '36px',
              paddingTop: '7px',
              paddingBottom: '7px',
              borderRadius: 'var(--radius-full)',
              fontSize: '13px',
            }}
          />
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Đổi chế độ giao diện sáng/tối"
            className="btn-ghost"
            style={{ padding: '6px 8px' }}
          >
            {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>

          <Link href="/submit" className="btn-ghost" style={{ padding: '6px 12px' }}>
            <PlusIcon size={15} />
            <span>Đăng bài</span>
          </Link>

          <Link
            href="/chat"
            onClick={handleChatClick}
            aria-label="Tin nhắn Realtime"
            className="btn-ghost"
            data-testid="header-chat-btn"
            style={{ padding: '6px 10px', position: 'relative' }}
          >
            <ChatBubbleIcon size={16} />
            {unreadTotal > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  backgroundColor: 'var(--color-brand)',
                  color: 'var(--text-inverse)',
                  borderRadius: 'var(--radius-full)',
                  padding: '1px 5px',
                  fontSize: '10px',
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {unreadTotal > 99 ? '99+' : unreadTotal}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <UserMenuDropdown onOpenSessionsModal={() => setSessionsModalOpen(true)} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="btn-ghost"
                style={{ padding: '6px 12px' }}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className="btn-primary"
                style={{ padding: '6px 14px' }}
              >
                Đăng ký
              </button>
            </div>
          )}
        </div>
      </header>

      <SessionsModal open={sessionsModalOpen} onClose={() => setSessionsModalOpen(false)} />
    </>
  );
}
