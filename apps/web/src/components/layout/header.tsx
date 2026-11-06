'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useUI } from '../../lib/store/ui-context';
import {
  BellIcon,
  ChatBubbleIcon,
  CloseIcon,
  ExternalLinkIcon,
  MenuIcon,
  PlusIcon,
  RedditAlienLogo,
  SearchIcon,
} from '../ui/icons';

export function Header() {
  const {
    toggleSidebar,
    chatWidgetState,
    setChatWidgetState,
    searchQuery,
    setSearchQuery,
    showToast,
  } = useUI();
  const [searchFocused, setSearchFocused] = useState(false);

  const toggleChat = () => {
    if (chatWidgetState === 'closed' || chatWidgetState === 'minimized') {
      setChatWidgetState('docked');
    } else {
      setChatWidgetState('minimized');
    }
  };

  return (
    <header className="header-sticky">
      {/* 1. Brand & Drawer Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Toggle Navigation Sidebar"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MenuIcon size={22} />
        </button>

        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: 'var(--text-primary)',
          }}
        >
          <RedditAlienLogo size={32} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                color: '#ffffff',
              }}
            >
              acad
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--color-brand)',
                textTransform: 'uppercase',
              }}
            >
              devops
            </span>
          </div>
        </Link>

        <span
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#1e2d24',
            color: '#46d160',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '9999px',
            border: '1px solid #285432',
          }}
          className="desktop-only-badge"
        >
          <span
            className="online-pulse"
            style={{ width: '6px', height: '6px', marginRight: '2px' }}
          />
          Self-Hosted
        </span>
      </div>

      {/* 2. Global Pill Search Bar */}
      <div className="search-pill-container">
        <SearchIcon
          size={16}
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: searchFocused ? 'var(--color-brand)' : 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          id="global-search-input"
          type="text"
          className="search-pill-input"
          placeholder="Search Acad DevOps (Press '/' to focus)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <CloseIcon size={14} />
          </button>
        ) : (
          <span
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: '#333336',
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid #444448',
              pointerEvents: 'none',
            }}
          >
            /
          </span>
        )}

        {/* Dropdown Suggestions */}
        {searchFocused && (
          <div
            style={{
              position: 'absolute',
              top: '46px',
              left: 0,
              right: 0,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-dropdown)',
              padding: '12px',
              zIndex: 60,
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Trending Communities
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                style={{
                  padding: '8px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  background: 'transparent',
                }}
                onMouseDown={() => setSearchQuery('r/devops-arch')}
              >
                <span style={{ color: 'var(--color-brand)', fontWeight: 700 }}>r/devops-arch</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  • 1.2k engineers
                </span>
              </div>
              <div
                style={{
                  padding: '8px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  background: 'transparent',
                }}
                onMouseDown={() => setSearchQuery('r/vozforums')}
              >
                <span style={{ color: 'var(--color-brand)', fontWeight: 700 }}>r/vozforums</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  • 4.5k discussions
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Action Utilities & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="reddit-pill-btn"
          style={{ display: 'none' }}
          id="docs-header-link"
        >
          <span>Docs</span>
          <ExternalLinkIcon size={12} />
        </a>

        {/* Realtime Chat Button with Red Badge */}
        <button
          type="button"
          onClick={toggleChat}
          className="reddit-pill-btn"
          title="Open Realtime Chat"
          style={{ position: 'relative', width: '38px', height: '38px', padding: 0 }}
        >
          <ChatBubbleIcon size={20} />
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              backgroundColor: '#ff4500',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 800,
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px var(--bg-surface)',
            }}
          >
            3
          </span>
        </button>

        {/* Create Post Button */}
        <button
          type="button"
          onClick={() =>
            showToast('Giao diện Soạn Thảo (Tiptap Editor) sẽ kích hoạt trong Phase F2')
          }
          className="reddit-pill-btn primary"
          style={{ gap: '4px', padding: '0 14px' }}
        >
          <PlusIcon size={18} />
          <span>Create</span>
        </button>

        {/* Notifications Bell */}
        <button
          type="button"
          onClick={() => showToast('Không có thông báo vi phạm mới')}
          className="reddit-pill-btn"
          title="Notifications"
          style={{ width: '38px', height: '38px', padding: 0 }}
        >
          <BellIcon size={20} />
        </button>

        {/* User Profile Avatar with Online Dot */}
        <div
          onClick={() => showToast('Menu Tài khoản & Quản lý phiên sẽ kích hoạt trong Phase F1')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '2px 8px 2px 2px',
            borderRadius: 'var(--radius-full)',
            cursor: 'pointer',
            backgroundColor: 'transparent',
          }}
        >
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#393e46',
                border: '2px solid var(--border-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: '#dfd0b8',
                fontSize: '13px',
              }}
            >
              AD
            </div>
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '10px',
                height: '10px',
                backgroundColor: 'var(--color-success)',
                borderRadius: '50%',
                border: '2px solid var(--bg-surface)',
              }}
            />
          </div>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              display: 'none',
            }}
            className="username-label"
          >
            admin_pro
          </span>
        </div>
      </div>
    </header>
  );
}
