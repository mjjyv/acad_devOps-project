'use client';

import Link from 'next/link';
import { useAuth } from '../../lib/auth/auth-context';
import { useUI } from '../../lib/store/ui-context';
import { ChatBubbleIcon, ExploreIcon, HomeIcon, PlusIcon } from '../ui/icons';

export function BottomNav() {
  const { chatWidgetState, setChatWidgetState, setActiveFeedTab } = useUI();
  const { user, isAuthenticated, openAuthModal } = useAuth();

  const handleChatClick = () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    setChatWidgetState(chatWidgetState === 'docked' ? 'minimized' : 'docked');
  };

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '56px',
        backgroundColor: 'rgba(26, 26, 27, 0.98)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50,
        padding: '0 8px',
      }}
      className="app-bottom-nav"
    >
      {/* 1. Home */}
      <Link
        href="/"
        onClick={() => {
          setActiveFeedTab(isAuthenticated ? 'following' : 'for_you');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        style={{
          color: 'var(--color-brand)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          fontSize: '10px',
          fontWeight: 700,
          textDecoration: 'none',
          padding: '4px 12px',
        }}
      >
        <HomeIcon size={20} />
        <span>Home</span>
      </Link>

      {/* 2. Explore */}
      <Link
        href="/"
        onClick={() => {
          setActiveFeedTab('for_you');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        style={{
          color: 'var(--text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          fontSize: '10px',
          fontWeight: 600,
          textDecoration: 'none',
          padding: '4px 12px',
        }}
      >
        <ExploreIcon size={20} />
        <span>Explore</span>
      </Link>

      {/* 3. Create (Elevated Center Button) */}
      <Link
        href="/submit"
        aria-label="Tạo bài viết mới"
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-brand)',
          color: '#30364F',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          boxShadow: '0 4px 12px rgba(225, 217, 188, 0.3)',
          transform: 'translateY(-6px)',
        }}
      >
        <PlusIcon size={22} />
      </Link>

      {/* 4. Chat */}
      <button
        type="button"
        onClick={handleChatClick}
        style={{
          background: 'transparent',
          border: 'none',
          color: chatWidgetState === 'docked' ? 'var(--color-brand)' : 'var(--text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          fontSize: '10px',
          fontWeight: 600,
          cursor: 'pointer',
          padding: '4px 12px',
          position: 'relative',
        }}
      >
        <ChatBubbleIcon size={20} />
        <span>Chat</span>
      </button>

      {/* 5. Profile */}
      {isAuthenticated && user ? (
        <Link
          href={`/u/${user.username}`}
          style={{
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            fontSize: '10px',
            fontWeight: 600,
            textDecoration: 'none',
            padding: '4px 12px',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#30364F',
              color: '#F0F0DB',
              fontSize: '10px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {user.username.charAt(0).toUpperCase()}
          </div>
          <span>Profile</span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            fontSize: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '4px 12px',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#30364F',
              color: '#E1D9BC',
              fontSize: '10px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ?
          </div>
          <span>Login</span>
        </button>
      )}
    </nav>
  );
}
