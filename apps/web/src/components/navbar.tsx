'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/auth-context';

export function Navbar() {
  const { user, logout, isLoading } = useAuth();

  return (
    <header
      style={{
        width: '100%',
        backgroundColor: '#0d131f',
        borderBottom: '1px solid #1e293b',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* LOGO */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '1.15rem',
            fontWeight: 800,
            color: '#f8fafc',
            textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: '1.4rem' }}>🏛️</span>
          <span>Acad Community</span>
        </Link>

        {/* RIGHT ACTIONS */}
        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
          <Link
            href="/docs"
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              backgroundColor: '#1e3a5f',
              color: '#38bdf8',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.875rem',
              border: '1px solid #0284c7',
            }}
          >
            📚 Docs (/docs)
          </Link>

          {!isLoading && user ? (
            <>
              {/* ADMIN BADGE LINK */}
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin/users"
                  style={{
                    padding: '0.45rem 0.9rem',
                    borderRadius: '6px',
                    backgroundColor: '#7f1d1d',
                    color: '#fca5a5',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    border: '1px solid #ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <span>🛡️</span>
                  <span>Quản trị Admin</span>
                </Link>
              )}

              {/* SESSIONS LINK */}
              <Link
                href="/settings/sessions"
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '6px',
                  backgroundColor: '#1e293b',
                  color: '#94a3b8',
                  fontWeight: 500,
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  border: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>💻</span>
                <span>Thiết bị</span>
              </Link>

              {/* USER PROFILE PILL */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.35rem 0.75rem',
                  backgroundColor: '#131b2e',
                  borderRadius: '9999px',
                  border: '1px solid #1e293b',
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: user.role === 'ADMIN' ? '#dc2626' : '#2563eb',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>{user.username}</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.1rem 0.4rem',
                    backgroundColor: '#064e3b',
                    color: '#6ee7b7',
                    borderRadius: '9999px',
                    fontWeight: 600,
                  }}
                >
                  ⭐ {user.karmaScore}
                </span>
              </div>

              {/* LOGOUT BUTTON */}
              <button
                onClick={() => logout()}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: '#ef4444',
                  border: '1px solid #7f1d1d',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Đăng xuất
              </button>
            </>
          ) : !isLoading ? (
            <>
              <Link
                href="/login"
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '6px',
                  backgroundColor: '#1e293b',
                  color: '#f8fafc',
                  fontWeight: 500,
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                }}
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '6px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                }}
              >
                Đăng ký
              </Link>
            </>
          ) : (
            <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Đang nạp...</div>
          )}
        </div>
      </div>
    </header>
  );
}
