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
        borderLeft: '1px solid #393E46',
      }}
    >
      <div
        style={{
          fontSize: '0.7rem',
          fontWeight: 800,
          color: '#948979',
          letterSpacing: '0.08em',
          marginBottom: '0.75rem',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-mono)',
        }}
      >
        // MỤC LỤC BÀI VIẾT
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {headings.map((h) => {
          const isActive = activeId === h.id;
          return (
            <a
              key={h.id}
              href={`#${h.id}`}
              style={{
                fontSize: '0.78rem',
                textDecoration: 'none',
                color: isActive ? '#DFD0B8' : '#948979',
                fontWeight: isActive ? 800 : 500,
                borderLeft: `2px solid ${isActive ? '#DFD0B8' : 'transparent'}`,
                paddingLeft: '0.6rem',
                marginLeft: h.level === 3 ? '0.75rem' : '0',
                fontFamily: 'var(--font-mono)',
                transition: 'all 0.15s ease',
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
