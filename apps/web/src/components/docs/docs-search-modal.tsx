'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/navigation';
import { useRouter } from 'next/navigation';
import { searchDocs } from '../../lib/docs-data/index.js';
import { DocItem } from '../../lib/docs-data/types.js';

interface DocsSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocsSearchModal({ isOpen, onClose }: DocsSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ doc: DocItem; matchScore: number }>>([]);

  useEffect(() => {
    if (query.trim()) {
      setResults(searchDocs(query));
    } else {
      setResults([]);
    }
  }, [query]);

  // Lắng nghe phím ESC để đóng
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (category: string, slug: string) => {
    onClose();
    router.push(`/docs/${category}/${slug}`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          backgroundColor: '#131926',
          border: '1px solid #334155',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '1rem', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>🔍</span>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm tài liệu, ma trận RBAC, Docker, Grace period..."
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: '1rem',
            }}
          />
          <kbd style={{ backgroundColor: '#1e293b', color: '#94a3b8', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem' }}>
            ESC
          </kbd>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '0.5rem' }}>
          {query.trim() === '' ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
              Nhập từ khóa để tìm kiếm trong PRD, An ninh, CSDL, DevOps và Checklist...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              Không tìm thấy tài liệu phù hợp với &quot;<strong>{query}</strong>&quot;.
            </div>
          ) : (
            results.map(({ doc }) => (
              <div
                key={doc.id}
                onClick={() => handleSelect(doc.category, doc.slug)}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '0.25rem',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: 500 }}>
                    {doc.categoryTitle}
                  </span>
                  {doc.stageBadge && (
                    <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                      {doc.stageBadge}
                    </span>
                  )}
                </div>
                <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                  {doc.title}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {doc.description}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
