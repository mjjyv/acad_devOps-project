'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../contexts/auth-context';

export function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams?.get('q') || '';
  const [searchValue, setSearchValue] = useState(initialQ);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchValue(searchParams?.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchValue.trim();
    if (query) {
      router.push(`/?q=${encodeURIComponent(query)}`);
    } else {
      router.push('/');
    }
  };

  return (
    <header
      style={{
        width: '100%',
        backgroundColor: '#393E46',
        borderBottom: '2px solid #948979',
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
        {/* BRAND LOGO BRUTALIST */}
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
              backgroundColor: '#DFD0B8',
              color: '#222831',
              border: '2px solid #948979',
              borderRadius: '0px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.05rem',
              boxShadow: '2px 2px 0px #948979',
            }}
          >
            A
          </div>
          <div>
            <div
              style={{
                fontSize: '1.05rem',
                fontWeight: 900,
                color: '#DFD0B8',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                fontFamily: 'var(--font-mono)',
              }}
            >
              ACAD.DEVOPS //
            </div>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#948979',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Core Community Platform
            </div>
          </div>
        </Link>

        {/* SEARCH BAR (MINIMALIST BRUTALISM DARK) */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            flex: '1',
            maxWidth: '460px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#948979"
            strokeWidth="2.5"
            strokeLinecap="square"
            strokeLinejoin="miter"
            style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Tìm kiếm kiến trúc, DevOps, thảo luận..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem 2.2rem 0.45rem 2.2rem',
              borderRadius: '0px',
              border: '2px solid #948979',
              backgroundColor: '#222831',
              color: '#DFD0B8',
              fontSize: '0.85rem',
              outline: 'none',
              boxShadow: 'inset 1px 1px 0px rgba(0,0,0,0.4)',
            }}
          />
          {searchValue ? (
            <button
              type="button"
              onClick={() => {
                setSearchValue('');
                router.push('/');
              }}
              style={{
                position: 'absolute',
                right: '8px',
                background: 'transparent',
                border: 'none',
                color: '#948979',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
              }}
            >
              ✕
            </button>
          ) : (
            <span
              style={{
                position: 'absolute',
                right: '10px',
                fontSize: '0.7rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '0px',
                backgroundColor: '#393E46',
                color: '#DFD0B8',
                fontFamily: 'var(--font-mono)',
                border: '1px solid #948979',
              }}
            >
              /
            </span>
          )}
        </form>

        {/* NAVIGATION ACTIONS */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link
            href="/docs"
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '0px',
              backgroundColor: '#393E46',
              color: '#DFD0B8',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.82rem',
              border: '2px solid #948979',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '2px 2px 0px #948979',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span>TÀI LIỆU</span>
          </Link>

          {!isLoading && user ? (
            <>
              {/* ADMIN BADGE LINK */}
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin/users"
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '0px',
                    backgroundColor: '#222831',
                    color: '#DFD0B8',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: '0.82rem',
                    border: '2px solid #DFD0B8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '2px 2px 0px #DFD0B8',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>ADMIN // HUB</span>
                </Link>
              )}

              {/* SESSIONS LINK */}
              <Link
                href="/settings/sessions"
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '0px',
                  backgroundColor: '#393E46',
                  color: '#DFD0B8',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: '0.82rem',
                  border: '2px solid #948979',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '2px 2px 0px #948979',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="0" ry="0" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <span>PHIÊN</span>
              </Link>

              {/* USER PROFILE INFO */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.3rem 0.65rem',
                  backgroundColor: '#222831',
                  borderRadius: '0px',
                  border: '2px solid #948979',
                  boxShadow: '2px 2px 0px #948979',
                }}
              >
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '0px',
                    backgroundColor: user.role === 'ADMIN' ? '#DFD0B8' : '#948979',
                    color: '#222831',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 900,
                  }}
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#DFD0B8' }}>{user.username}</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.1rem 0.35rem',
                    backgroundColor: '#393E46',
                    color: '#DFD0B8',
                    borderRadius: '0px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    border: '1px solid #948979',
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
                  borderRadius: '0px',
                  backgroundColor: '#222831',
                  color: '#D96B6B',
                  border: '2px solid #D96B6B',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: '2px 2px 0px #D96B6B',
                }}
              >
                THOÁT
              </button>
            </>
          ) : !isLoading ? (
            <>
              <Link
                href="/login"
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '0px',
                  backgroundColor: '#393E46',
                  color: '#DFD0B8',
                  fontWeight: 700,
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  border: '2px solid #948979',
                  boxShadow: '2px 2px 0px #948979',
                  textTransform: 'uppercase',
                }}
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                style={{
                  padding: '0.45rem 1.1rem',
                  borderRadius: '0px',
                  backgroundColor: '#DFD0B8',
                  color: '#222831',
                  fontWeight: 800,
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  border: '2px solid #DFD0B8',
                  boxShadow: '3px 3px 0px #948979',
                  textTransform: 'uppercase',
                }}
              >
                Tham gia
              </Link>
            </>
          ) : (
            <div style={{ color: '#948979', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>LOADING...</div>
          )}
        </div>
      </div>
    </header>
  );
}
