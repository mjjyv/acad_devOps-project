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
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #334155',
        backgroundColor: '#090d16',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 1rem',
          backgroundColor: '#131926',
          borderBottom: '1px solid #1e293b',
          fontSize: '0.8rem',
          color: '#94a3b8',
        }}
      >
        <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>
          {filename || language.toUpperCase()}
        </span>
        <button
          onClick={handleCopy}
          type="button"
          style={{
            background: copied ? '#059669' : '#1e293b',
            color: copied ? '#ffffff' : '#cbd5e1',
            border: '1px solid #475569',
            borderRadius: '4px',
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {copied ? '✓ Đã chép' : 'Sao chép'}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '1rem',
          overflowX: 'auto',
          fontSize: '0.875rem',
          lineHeight: '1.6',
          color: '#e2e8f0',
          fontFamily: '"JetBrains Mono", Consolas, Monaco, monospace',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
