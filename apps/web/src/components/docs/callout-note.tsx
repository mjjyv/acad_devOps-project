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
  { borderLeft: string; text: string; icon: string; defaultTitle: string }
> = {
  note: {
    borderLeft: '#948979',
    text: '#DFD0B8',
    icon: '[i]',
    defaultTitle: 'Ghi chú kiến trúc',
  },
  tip: {
    borderLeft: '#4E9F3D',
    text: '#DFD0B8',
    icon: '[💡]',
    defaultTitle: 'Mẹo kỹ thuật (Pro Tip)',
  },
  important: {
    borderLeft: '#DFD0B8',
    text: '#DFD0B8',
    icon: '[!]',
    defaultTitle: 'Lưu ý cốt lõi (Important)',
  },
  warning: {
    borderLeft: '#f59e0b',
    text: '#f59e0b',
    icon: '[⚠️]',
    defaultTitle: 'Cảnh báo an ninh (Warning)',
  },
  danger: {
    borderLeft: '#ff5555',
    text: '#ff5555',
    icon: '[🛑]',
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
        borderRadius: '0px',
        backgroundColor: '#393E46',
        border: '2px solid #948979',
        borderLeft: `6px solid ${style.borderLeft}`,
        boxShadow: '3px 3px 0px #948979',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>{style.icon}</span>
        <strong style={{ color: style.text, fontSize: '0.9rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
          {title || style.defaultTitle}
        </strong>
      </div>
      <div style={{ color: '#DFD0B8', fontSize: '0.88rem', lineHeight: '1.6' }}>{children}</div>
    </div>
  );
}
