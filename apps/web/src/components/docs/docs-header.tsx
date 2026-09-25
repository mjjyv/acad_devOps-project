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
          backgroundColor: '#0b0f17',
          borderBottom: '1px solid #1e293b',
          color: '#f8fafc',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/docs" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', color: '#f8fafc' }}>
            <span style={{ fontSize: '1.4rem' }}>📚</span>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
              Acad Community Docs
            </span>
          </Link>
          <span
            style={{
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: '#1e3a5f',
              color: '#38bdf8',
            }}
          >
            v1.0.0 Enterprise
          </span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button
            onClick={() => setSearchOpen(true)}
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: '1px solid #334155',
              backgroundColor: '#131926',
              color: '#94a3b8',
              fontSize: '0.85rem',
              cursor: 'pointer',
              minWidth: '220px',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🔍</span>
              <span>Tìm kiếm tài liệu...</span>
            </span>
            <kbd style={{ backgroundColor: '#1e293b', color: '#cbd5e1', padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.7rem' }}>
              Ctrl K
            </kbd>
          </button>

          <Link href="/docs/checklist" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
            📋 Checklist 7 Giai đoạn
          </Link>

          <Link href="/" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
            🌐 Về Ứng dụng
          </Link>

          <a
            href="https://github.com/mjjyv/acad_devOps-project"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            <span>GitHub</span>
            <span style={{ fontSize: '0.7rem' }}>↗</span>
          </a>
        </nav>
      </header>

      <DocsSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
