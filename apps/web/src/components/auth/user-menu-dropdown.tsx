'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { FireIcon, ShieldIcon } from '@/components/ui/icons';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';

interface UserMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSessions: () => void;
}

export function UserMenuDropdown({ isOpen, onClose, onOpenSessions }: UserMenuDropdownProps) {
  const { user, logout } = useAuth();
  const { showToast } = useUI();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const handleLogout = async () => {
    onClose();
    await logout();
    showToast('Đã đăng xuất thành công');
  };

  const isAdminOrMod =
    user.role === 'ADMIN' || user.role === 'GLOBAL_MOD' || user.role === 'SPACE_MOD';

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: '12px',
        width: '260px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-dropdown)',
        padding: '8px 0',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* User Summary Card */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            u/{user.username}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: user.role === 'ADMIN' ? 'var(--color-danger)' : 'var(--bg-badge)',
              color: '#ffffff',
            }}
          >
            {user.role}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'var(--color-brand)',
          }}
        >
          <FireIcon size={14} />
          <span style={{ fontWeight: 600 }}>{user.karmaScore || 0} karma</span>
        </div>

        <span
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {user.email}
        </span>
      </div>

      {/* Menu Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
        <Link
          href={`/u/${user.username}`}
          onClick={onClose}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            color: 'var(--text-primary)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <span>👤</span>
          <span>Hồ Sơ Cá Nhân (Profile)</span>
        </Link>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenSessions();
          }}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            color: 'var(--text-primary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            textAlign: 'left',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <ShieldIcon size={16} />
          <span>Quản Lý Phiên & Thiết Bị</span>
        </button>

        {isAdminOrMod && (
          <Link
            href="/admin"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              color: 'var(--color-brand)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontWeight: 600,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')
            }
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span>🛡️</span>
            <span>Admin Control Hub</span>
          </Link>
        )}
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />

      {/* Logout button */}
      <button
        type="button"
        onClick={handleLogout}
        style={{
          padding: '8px 16px',
          fontSize: '13px',
          color: 'var(--color-danger)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          textAlign: 'left',
          fontWeight: 600,
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <span>🚪</span>
        <span>Đăng Xuất</span>
      </button>
    </div>
  );
}
