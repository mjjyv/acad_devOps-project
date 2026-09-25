'use client';

import React from 'react';

export type CalloutType = 'note' | 'tip' | 'important' | 'warning' | 'danger';

interface CalloutNoteProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}

const CALLOUT_STYLES: Record<
  CalloutType,
  { bg: string; border: string; text: string; icon: string; defaultTitle: string }
> = {
  note: {
    bg: '#0c2135',
    border: '#0284c7',
    text: '#7dd3fc',
    icon: 'ℹ️',
    defaultTitle: 'Ghi chú',
  },
  tip: {
    bg: '#062d1f',
    border: '#10b981',
    text: '#6ee7b7',
    icon: '💡',
    defaultTitle: 'Mẹo kỹ thuật (Pro Tip)',
  },
  important: {
    bg: '#27193d',
    border: '#a855f7',
    text: '#d8b4fe',
    icon: '⚡',
    defaultTitle: 'Lưu ý cốt lõi (Important)',
  },
  warning: {
    bg: '#332308',
    border: '#f59e0b',
    text: '#fde68a',
    icon: '⚠️',
    defaultTitle: 'Cảnh báo an ninh (Warning)',
  },
  danger: {
    bg: '#371318',
    border: '#ef4444',
    text: '#fca5a5',
    icon: '🛑',
    defaultTitle: 'Rủi ro nghiêm trọng (Danger)',
  },
};

export function CalloutNote({ type = 'note', title, children }: CalloutNoteProps) {
  const style = CALLOUT_STYLES[type];

  return (
    <div
      style={{
        margin: '1.25rem 0',
        padding: '1rem 1.25rem',
        borderRadius: '8px',
        backgroundColor: style.bg,
        borderLeft: `4px solid ${style.border}`,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.1rem' }}>{style.icon}</span>
        <strong style={{ color: style.text, fontSize: '0.95rem', fontWeight: 600 }}>
          {title || style.defaultTitle}
        </strong>
      </div>
      <div style={{ color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.6' }}>{children}</div>
    </div>
  );
}
