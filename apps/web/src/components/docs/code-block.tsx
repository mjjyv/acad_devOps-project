'use client';

import React, { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

export function CodeBlock({ code, language = 'bash', filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div
      style={{
        margin: '1.25rem 0',
        borderRadius: '0px',
        overflow: 'hidden',
        border: '2px solid #948979',
        backgroundColor: '#222831',
        boxShadow: '3px 3px 0px #948979',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.45rem 1rem',
          backgroundColor: '#393E46',
          borderBottom: '2px solid #948979',
          fontSize: '0.78rem',
          color: '#DFD0B8',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span style={{ fontWeight: 800, color: '#DFD0B8' }}>
          {filename || language.toUpperCase()}
        </span>
        <button
          onClick={handleCopy}
          type="button"
          style={{
            background: copied ? '#DFD0B8' : '#222831',
            color: copied ? '#222831' : '#DFD0B8',
            border: '1px solid #948979',
            borderRadius: '0px',
            padding: '0.2rem 0.55rem',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          {copied ? '[ ĐÃ SAO CHÉP ]' : '[ SAO CHÉP ]'}
        </button>
      </div>

      <pre
        style={{
          margin: 0,
          padding: '1rem',
          overflowX: 'auto',
          color: '#DFD0B8',
          fontSize: '0.85rem',
          fontFamily: 'var(--font-mono)',
          lineHeight: '1.5',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
