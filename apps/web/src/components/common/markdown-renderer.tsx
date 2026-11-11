'use client';

import type React from 'react';
import { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  // Split content by lines and group into blocks
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];
  let blockquoteLines: string[] = [];
  let listItems: { ordered: boolean; text: string; num?: string }[] = [];

  const flushCodeBlock = (key: string) => {
    if (codeBlockLines.length > 0) {
      const codeText = codeBlockLines.join('\n');
      blocks.push(<CodeBlockWidget key={`code-${key}`} code={codeText} language={codeBlockLang} />);
      codeBlockLines = [];
      codeBlockLang = '';
    }
  };

  let quoteCounter = 0;
  const flushBlockquote = (key: string) => {
    if (blockquoteLines.length > 0) {
      blocks.push(
        <blockquote
          key={`quote-${key}`}
          style={{
            borderLeft: '3px solid var(--color-brand)',
            margin: '12px 0',
            padding: '8px 16px',
            backgroundColor: 'rgba(225, 217, 188, 0.04)',
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}
        >
          {blockquoteLines.map((line) => {
            const bqKey = `bq-${++quoteCounter}-${line.slice(0, 16)}`;
            return (
              <p key={bqKey} style={{ margin: '4px 0' }}>
                {renderInline(line)}
              </p>
            );
          })}
        </blockquote>,
      );
      blockquoteLines = [];
    }
  };

  let listCounter = 0;
  const flushList = (key: string) => {
    if (listItems.length > 0) {
      const isOrdered = listItems[0].ordered;
      if (isOrdered) {
        blocks.push(
          <ol
            key={`ol-${key}`}
            style={{
              paddingLeft: '24px',
              margin: '10px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              color: 'var(--text-primary)',
            }}
          >
            {listItems.map((item) => {
              const liKey = `ol-item-${++listCounter}-${item.text.slice(0, 16)}`;
              return (
                <li key={liKey} style={{ lineHeight: 1.6 }}>
                  {renderInline(item.text)}
                </li>
              );
            })}
          </ol>,
        );
      } else {
        blocks.push(
          <ul
            key={`ul-${key}`}
            style={{
              paddingLeft: '24px',
              margin: '10px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              color: 'var(--text-primary)',
            }}
          >
            {listItems.map((item) => {
              const liKey = `ul-item-${++listCounter}-${item.text.slice(0, 16)}`;
              return (
                <li key={liKey} style={{ lineHeight: 1.6 }}>
                  {renderInline(item.text)}
                </li>
              );
            })}
          </ul>,
        );
      }
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Code Block boundary
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        inCodeBlock = false;
        flushCodeBlock(`${i}`);
      } else {
        // Start of code block
        flushList(`${i}`);
        flushBlockquote(`${i}`);
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // 2. Blockquotes
    if (trimmed.startsWith('>')) {
      flushList(`${i}`);
      blockquoteLines.push(trimmed.slice(1).trim());
      continue;
    }
    if (blockquoteLines.length > 0 && !trimmed.startsWith('>')) {
      flushBlockquote(`${i}`);
    }

    // 3. Lists
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      flushBlockquote(`${i}`);
      listItems.push({ ordered: true, num: orderedMatch[1], text: orderedMatch[2] });
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      flushBlockquote(`${i}`);
      listItems.push({ ordered: false, text: unorderedMatch[1] });
      continue;
    }

    // If we were building a list and line is not a list item:
    if (listItems.length > 0) {
      flushList(`${i}`);
    }

    // 4. Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      blocks.push(
        <hr
          key={`hr-${i}`}
          style={{
            border: 'none',
            borderTop: '1px solid var(--border-subtle)',
            margin: '18px 0',
          }}
        />,
      );
      continue;
    }

    // 5. Empty line
    if (!trimmed) {
      continue;
    }

    // 5. Headings
    if (trimmed.startsWith('### ')) {
      blocks.push(
        <h3
          key={`h3-${i}`}
          style={{
            fontSize: '17px',
            fontWeight: 800,
            color: 'var(--color-brand)',
            margin: '20px 0 10px 0',
            letterSpacing: '0.01em',
          }}
        >
          {renderInline(trimmed.slice(4))}
        </h3>,
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push(
        <h2
          key={`h2-${i}`}
          style={{
            fontSize: '20px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '24px 0 12px 0',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '6px',
          }}
        >
          {renderInline(trimmed.slice(3))}
        </h2>,
      );
      continue;
    }

    if (trimmed.startsWith('# ')) {
      blocks.push(
        <h1
          key={`h1-${i}`}
          style={{
            fontSize: '24px',
            fontWeight: 900,
            color: 'var(--text-primary)',
            margin: '28px 0 14px 0',
          }}
        >
          {renderInline(trimmed.slice(2))}
        </h1>,
      );
      continue;
    }

    // 6. Regular Paragraph
    blocks.push(
      <p
        key={`p-${i}`}
        style={{
          margin: '10px 0',
          lineHeight: 1.7,
          color: 'var(--text-primary)',
          fontSize: '14.5px',
        }}
      >
        {renderInline(trimmed)}
      </p>,
    );
  }

  // Final flushes
  flushCodeBlock('final');
  flushBlockquote('final');
  flushList('final');

  return <div className={`markdown-body ${className}`}>{blocks}</div>;
}

/**
 * Component hiển thị Code Block với giao diện Dark Canvas & Nút Copy Code
 */
function CodeBlockWidget({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{
        margin: '14px 0',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        backgroundColor: '#131620',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 14px',
          backgroundColor: '#1b2030',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        <span>{language || 'text'}</span>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            background: 'transparent',
            border: 'none',
            color: copied ? 'var(--color-success)' : 'var(--color-brand)',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '14px 16px',
          overflowX: 'auto',
          fontSize: '13px',
          lineHeight: 1.55,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          color: '#e1d9bc',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

function isSafeMediaOrLinkUrl(raw: string): boolean {
  const trimmed = raw.trim();
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  );
}

/**
 * Phân tích cú pháp inline markdown (Images, Bold, Italic, Inline Code, Links)
 */
let inlineTokenCounter = 0;
function renderInline(text: string): React.ReactNode {
  // Regex to match: ![alt](url), **bold**, `code`, [link](url), *italic*
  const tokenRegex = /(!\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part) => {
    const tokenKey = `token-${++inlineTokenCounter}-${part.slice(0, 10)}`;
    if (part.startsWith('![') && part.includes('](') && part.endsWith(')')) {
      const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgMatch && isSafeMediaOrLinkUrl(imgMatch[2])) {
        return (
          <img
            key={tokenKey}
            src={imgMatch[2]}
            alt={imgMatch[1] || 'embedded image'}
            loading="lazy"
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: '460px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              margin: '10px 0',
              objectFit: 'contain',
            }}
          />
        );
      }
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={tokenKey} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={tokenKey}
          style={{
            backgroundColor: 'rgba(225, 217, 188, 0.1)',
            color: 'var(--color-brand)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12.5px',
            fontFamily: 'monospace',
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match && isSafeMediaOrLinkUrl(match[2])) {
        return (
          <a
            key={tokenKey}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--color-brand)',
              textDecoration: 'underline',
              fontWeight: 600,
            }}
          >
            {match[1]}
          </a>
        );
      }
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={tokenKey} style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}
