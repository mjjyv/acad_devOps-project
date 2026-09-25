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
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E6DFD5',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1360px',
          margin: '0 auto',
          padding: '0.65rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.5rem',
        }}
      >
        {/* BRAND LOGO */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#12544F',
              color: '#F5EFE3',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '-0.03em',
            }}
          >
            A
          </div>
          <div>
            <div
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#12544F',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              ACAD
            </div>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                color: '#787774',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              DevOps Community
            </div>
          </div>
        </Link>

        {/* SEARCH BAR (EDITORIAL MINIMALIST) */}
        <div
          style={{
            flex: '1',
            maxWidth: '480px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#787774"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm kiến trúc, kỹ nghệ DevOps, thảo luận..."
            style={{
              width: '100%',
              padding: '0.45rem 2.2rem 0.45rem 2.2rem',
              borderRadius: '6px',
              border: '1px solid #E6DFD5',
              backgroundColor: '#FAF7F2',
              color: '#4A4A4A',
              fontSize: '0.85rem',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: '10px',
              fontSize: '0.7rem',
              padding: '0.1rem 0.35rem',
              borderRadius: '4px',
              backgroundColor: '#EAE6DF',
              color: '#787774',
              fontFamily: 'var(--font-mono)',
              border: '1px solid #DDD6CB',
            }}
          >
            /
          </span>
        </div>

        {/* NAVIGATION ACTIONS */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link
            href="/docs"
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              backgroundColor: '#FAF7F2',
              color: '#4A4A4A',
              fontWeight: 500,
              textDecoration: 'none',
              fontSize: '0.85rem',
              border: '1px solid #E6DFD5',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span>Tài Liệu</span>
          </Link>

          {!isLoading && user ? (
            <>
              {/* ADMIN BADGE LINK */}
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin/users"
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    backgroundColor: '#EAF2F1',
                    color: '#12544F',
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    border: '1px solid rgba(18, 84, 79, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Quản trị Admin</span>
                </Link>
              )}

              {/* SESSIONS LINK */}
              <Link
                href="/settings/sessions"
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#4A4A4A',
                  fontWeight: 500,
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  border: '1px solid #E6DFD5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <span>Phiên thiết bị</span>
              </Link>

              {/* USER PROFILE INFO */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.3rem 0.65rem',
                  backgroundColor: '#FAF7F2',
                  borderRadius: '6px',
                  border: '1px solid #E6DFD5',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    backgroundColor: user.role === 'ADMIN' ? '#12544F' : '#4A4A4A',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E2328' }}>{user.username}</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.1rem 0.4rem',
                    backgroundColor: '#EAF2F1',
                    color: '#12544F',
                    borderRadius: '4px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {user.karmaScore} pts
                </span>
              </div>

              {/* LOGOUT BUTTON */}
              <button
                onClick={() => logout()}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: '#9F2F2D',
                  border: '1px solid #FDEBEC',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
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
                  padding: '0.45rem 1rem',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#4A4A4A',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  border: '1px solid #E6DFD5',
                }}
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '6px',
                  backgroundColor: '#12544F',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  border: '1px solid #0E3F3B',
                }}
              >
                Tham gia
              </Link>
            </>
          ) : (
            <div style={{ color: '#787774', fontSize: '0.85rem' }}>Đang nạp...</div>
          )}
        </div>
      </div>
    </header>
  );
}
