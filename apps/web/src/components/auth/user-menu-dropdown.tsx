'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { DeviceIcon, ShieldIcon } from '../ui/icons';

interface UserMenuDropdownProps {
  onOpenSessionsModal: () => void;
}

export function UserMenuDropdown({ onOpenSessionsModal }: UserMenuDropdownProps) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="btn-ghost"
        style={{
          padding: '4px 10px',
          gap: '8px',
          borderRadius: 'var(--radius-full)',
        }}
        aria-expanded={open}
        aria-label="Mở menu tài khoản"
      >
        <span
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-brand)',
            color: 'var(--text-inverse)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '12px',
          }}
        >
          {user.username.slice(0, 1).toUpperCase()}
        </span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{user.username}</span>
      </button>

      {open && (
        <div
          className="surface-card"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: '230px',
            padding: '8px',
            boxShadow: 'var(--shadow-dropdown)',
            zIndex: 80,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-divider)' }}>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{user.username}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {user.karmaScore} Karma · {user.role}
            </div>
          </div>

          <Link
            href={`/u/${user.username}`}
            onClick={() => setOpen(false)}
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontSize: '13px',
            }}
          >
            Hồ sơ công khai
          </Link>

          <Link
            href="/settings/sessions"
            onClick={() => setOpen(false)}
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <DeviceIcon size={15} />
            <span>Quản lý phiên & thiết bị</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenSessionsModal();
            }}
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Xem nhanh phiên hoạt động
          </button>

          {(user.role === 'ADMIN' || user.role === 'GLOBAL_MOD') && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontSize: '13px',
                color: 'var(--color-brand)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
              }}
            >
              <ShieldIcon size={15} />
              <span>Admin Console</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
            style={{
              marginTop: '4px',
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              borderTop: '1px solid var(--border-divider)',
              background: 'transparent',
              color: 'var(--color-danger)',
              textAlign: 'left',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
