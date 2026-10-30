'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DocsSearchModal } from './docs-search-modal.js';

export function DocsHeader() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '60px',
          padding: '0 1.5rem',
          backgroundColor: '#393E46',
          borderBottom: '2px solid #948979',
          color: '#DFD0B8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            href="/docs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              textDecoration: 'none',
              color: '#DFD0B8',
            }}
          >
            <span
              style={{
                width: '28px',
                height: '28px',
                backgroundColor: '#222831',
                color: '#DFD0B8',
                border: '2px solid #948979',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              DOCS
            </span>
            <span
              style={{
                fontWeight: 900,
                fontSize: '1.05rem',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '-0.01em',
              }}
            >
              ACAD.DOCS //
            </span>
          </Link>
          <span
            style={{
              padding: '0.15rem 0.5rem',
              fontSize: '0.72rem',
              fontWeight: 800,
              backgroundColor: '#222831',
              color: '#DFD0B8',
              border: '1px solid #948979',
              fontFamily: 'var(--font-mono)',
            }}
          >
            v1.0.0
          </span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setSearchOpen(true)}
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '0px',
              border: '2px solid #948979',
              backgroundColor: '#222831',
              color: '#DFD0B8',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              minWidth: '220px',
              justifyContent: 'space-between',
              boxShadow: '2px 2px 0px #948979',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🔍</span>
              <span>Tìm kiếm tài liệu...</span>
            </span>
            <kbd
              style={{
                backgroundColor: '#393E46',
                color: '#DFD0B8',
                padding: '0.1rem 0.35rem',
                borderRadius: '0px',
                fontSize: '0.7rem',
                border: '1px solid #948979',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Ctrl K
            </kbd>
          </button>

          <Link
            href="/docs/checklist"
            style={{
              color: '#DFD0B8',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              padding: '0.35rem 0.65rem',
              border: '1px solid #948979',
              backgroundColor: '#222831',
            }}
          >
            CHECKLIST 7 GIAI ĐOẠN
          </Link>

          <Link
            href="/"
            style={{
              color: '#DFD0B8',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              padding: '0.35rem 0.65rem',
              border: '1px solid #948979',
              backgroundColor: '#222831',
            }}
          >
            &larr; TRANG CHỦ
          </Link>

          <a
            href="https://github.com/mjjyv/acad_devOps-project"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#948979',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
            }}
          >
            <span>GITHUB</span>
            <span style={{ fontSize: '0.7rem' }}>&nearr;</span>
          </a>
        </nav>
      </header>

      <DocsSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
