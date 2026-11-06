'use client';

import { useUI } from '../../lib/store/ui-context';
import { ChatBubbleIcon, ExploreIcon, HomeIcon, PlusIcon } from '../ui/icons';

export function BottomNav() {
  const { chatWidgetState, setChatWidgetState, showToast } = useUI();

  const handleChatClick = () => {
    if (chatWidgetState === 'docked') {
      setChatWidgetState('minimized');
    } else {
      setChatWidgetState('docked');
    }
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
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--color-brand)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          fontSize: '10px',
          fontWeight: 700,
          cursor: 'pointer',
          padding: '4px 12px',
        }}
      >
        <HomeIcon size={20} />
        <span>Home</span>
      </button>

      {/* 2. Explore */}
      <button
        type="button"
        onClick={() => showToast('Khám phá danh mục Space sẽ mở trong Phase F2')}
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
        <ExploreIcon size={20} />
        <span>Explore</span>
      </button>

      {/* 3. Create (Elevated Center Button) */}
      <button
        type="button"
        onClick={() => showToast('Mở trình soạn thảo Tiptap Editor (Phase F2)')}
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-brand)',
          border: 'none',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(255, 69, 0, 0.4)',
          transform: 'translateY(-6px)',
        }}
      >
        <PlusIcon size={22} />
      </button>

      {/* 4. Chat with Red Badge */}
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
        <div style={{ position: 'relative' }}>
          <ChatBubbleIcon size={20} />
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-6px',
              backgroundColor: '#ff4500',
              color: '#ffffff',
              fontSize: '9px',
              fontWeight: 800,
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            3
          </span>
        </div>
        <span>Chat</span>
      </button>

      {/* 5. Profile */}
      <button
        type="button"
        onClick={() => showToast('Hồ sơ cá nhân & Phiên làm việc (Phase F1)')}
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
            backgroundColor: '#393e46',
            color: '#dfd0b8',
            fontSize: '10px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          AD
        </div>
        <span>Profile</span>
      </button>
    </nav>
  );
}
