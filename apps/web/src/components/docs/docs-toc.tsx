'use client';

import React, { useEffect, useState } from 'react';
import { DocSectionHeading } from '../../lib/docs-data/types.js';

interface DocsTocProps {
  headings?: DocSectionHeading[];
}

export function DocsToc({ headings = [] }: DocsTocProps) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      for (let i = headings.length - 1; i >= 0; i--) {
        const el = document.getElementById(headings[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveId(headings[i].id);
          return;
        }
      }
      setActiveId(headings[0].id);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <aside
      style={{
        width: '240px',
        flexShrink: 0,
        height: 'calc(100vh - 60px)',
        position: 'sticky',
        top: '60px',
        overflowY: 'auto',
        padding: '1.5rem 1rem',
      }}
    >
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#64748b',
          letterSpacing: '0.06em',
          marginBottom: '0.75rem',
          textTransform: 'uppercase',
        }}
      >
        Mục lục bài viết
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {headings.map((h) => {
          const isActive = activeId === h.id;
          return (
            <a
              key={h.id}
              href={`#${h.id}`}
              style={{
                display: 'block',
                textDecoration: 'none',
                fontSize: '0.8rem',
                lineHeight: '1.4',
                paddingLeft: h.level === 3 ? '1rem' : '0.25rem',
                color: isActive ? '#38bdf8' : '#94a3b8',
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? '2px solid #38bdf8' : '2px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {h.title}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
