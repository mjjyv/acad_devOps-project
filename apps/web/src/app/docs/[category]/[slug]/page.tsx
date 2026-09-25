import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllDocs, getDocBySlug } from '../../../../lib/docs-data/index.js';
import { DocsToc } from '../../../../components/docs/docs-toc.js';
import { CalloutNote } from '../../../../components/docs/callout-note.js';

interface DocPageProps {
  params: Promise<{
    category: string;
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const docs = getAllDocs();
  return docs.map((doc) => ({
    category: doc.category,
    slug: doc.slug,
  }));
}

export default async function DocDetailPage({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);

  if (!doc) {
    notFound();
  }

  const allDocs = getAllDocs();
  const currentIndex = allDocs.findIndex((d) => d.slug === doc.slug);
  const prevDoc = currentIndex > 0 ? allDocs[currentIndex - 1] : null;
  const nextDoc = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null;

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      {/* KHU VỰC NỘI DUNG CHÍNH */}
      <article style={{ flex: 1, padding: '2rem 3rem', maxWidth: '840px', minWidth: 0 }}>
        {/* BREADCRUMBS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
          <Link href="/docs" style={{ color: '#94a3b8', textDecoration: 'none' }}>
            Docs
          </Link>
          <span>/</span>
          <span style={{ color: '#94a3b8' }}>{doc.categoryTitle}</span>
          <span>/</span>
          <span style={{ color: '#38bdf8' }}>{doc.title}</span>
        </div>

        {/* TIÊU ĐỀ BÀI VIẾT */}
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.75rem 0', letterSpacing: '-0.02em', lineHeight: '1.3' }}>
          {doc.title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {doc.stageBadge && (
            <span style={{ backgroundColor: '#064e3b', color: '#6ee7b7', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
              {doc.stageBadge}
            </span>
          )}
          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
            Cập nhật: {doc.updatedAt}
          </span>
          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
            • Thời gian đọc: ~{doc.readingTimeMinutes} phút
          </span>
        </div>

        <p style={{ fontSize: '1.05rem', color: '#94a3b8', lineHeight: '1.6', marginBottom: '1.5rem' }}>
          {doc.description}
        </p>

        {/* KEY TAKEAWAYS CALLOUT */}
        <CalloutNote type="important" title="Ghi Chú Kỹ Thuật Trọng Điểm (Key Takeaways)">
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {doc.keyTakeaways.map((point, idx) => (
              <li key={idx} style={{ color: '#f1f5f9' }}>
                {point}
              </li>
            ))}
          </ul>
        </CalloutNote>

        {/* NỘI DUNG CHI TIẾT */}
        <div style={{ marginTop: '2rem', color: '#e2e8f0', lineHeight: '1.7', fontSize: '0.95rem' }}>
          {doc.content.split('\n\n').map((paragraph, idx) => {
            const trimmed = paragraph.trim();
            if (!trimmed) return null;

            if (trimmed.startsWith('## ')) {
              const title = trimmed.replace('## ', '');
              const idMatch = doc.headings.find((h) => h.title.includes(title) || title.includes(h.title));
              const id = idMatch ? idMatch.id : `section-${idx}`;
              return (
                <h2
                  key={idx}
                  id={id}
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#f8fafc',
                    marginTop: '2.5rem',
                    marginBottom: '1rem',
                    borderBottom: '1px solid #1e293b',
                    paddingBottom: '0.5rem',
                  }}
                >
                  {title}
                </h2>
              );
            }

            if (trimmed.startsWith('- ')) {
              const items = trimmed.split('\n').filter((l) => l.startsWith('- '));
              return (
                <ul key={idx} style={{ margin: '0.75rem 0', paddingLeft: '1.25rem' }}>
                  {items.map((it, itIdx) => (
                    <li key={itIdx} style={{ marginBottom: '0.35rem', color: '#cbd5e1' }}>
                      {it.replace('- ', '')}
                    </li>
                  ))}
                </ul>
              );
            }

            if (trimmed.startsWith('```')) {
              const codeLines = trimmed.split('\n');
              const language = codeLines[0].replace('```', '') || 'text';
              const codeContent = codeLines.slice(1, -1).join('\n');
              return (
                <pre
                  key={idx}
                  style={{
                    backgroundColor: '#090d16',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #1e293b',
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: '#38bdf8',
                    margin: '1rem 0',
                  }}
                >
                  <code>{codeContent}</code>
                </pre>
              );
            }

            return (
              <p key={idx} style={{ marginBottom: '1rem', color: '#cbd5e1' }}>
                {trimmed}
              </p>
            );
          })}
        </div>

        {/* NEXT / PREV PAGINATION */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '3.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid #1e293b',
          }}
        >
          {prevDoc ? (
            <Link
              href={`/docs/${prevDoc.category}/${prevDoc.slug}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                textDecoration: 'none',
                color: '#94a3b8',
              }}
            >
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>
                ← Bài trước
              </span>
              <span style={{ fontWeight: 600, color: '#38bdf8', fontSize: '0.95rem' }}>
                {prevDoc.title}
              </span>
            </Link>
          ) : (
            <div />
          )}

          {nextDoc ? (
            <Link
              href={`/docs/${nextDoc.category}/${nextDoc.slug}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                textDecoration: 'none',
                color: '#94a3b8',
              }}
            >
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>
                Bài tiếp theo →
              </span>
              <span style={{ fontWeight: 600, color: '#38bdf8', fontSize: '0.95rem' }}>
                {nextDoc.title}
              </span>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </article>

      {/* RIGHT SIDEBAR TABLE OF CONTENTS */}
      <DocsToc headings={doc.headings} />
    </div>
  );
}
