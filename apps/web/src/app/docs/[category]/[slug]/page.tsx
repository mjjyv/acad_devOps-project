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
    <div style={{ display: 'flex', width: '100%', color: '#DFD0B8' }}>
      {/* KHU VỰC NỘI DUNG CHÍNH */}
      <article style={{ flex: 1, padding: '2rem 3rem', maxWidth: '840px', minWidth: 0 }}>
        {/* BREADCRUMBS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: '#948979',
            marginBottom: '1rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <Link href="/docs" style={{ color: '#948979', textDecoration: 'none' }}>
            ACAD.DOCS
          </Link>
          <span>//</span>
          <span style={{ color: '#948979' }}>{doc.categoryTitle.toUpperCase()}</span>
          <span>//</span>
          <span style={{ color: '#DFD0B8', fontWeight: 800 }}>{doc.title}</span>
        </div>

        {/* TIÊU ĐỀ BÀI VIẾT */}
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 900,
            color: '#DFD0B8',
            margin: '0 0 0.75rem 0',
            fontFamily: 'var(--font-mono)',
            lineHeight: '1.3',
          }}
        >
          {doc.title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {doc.stageBadge && (
            <span
              style={{
                backgroundColor: '#222831',
                color: '#DFD0B8',
                border: '1px solid #948979',
                padding: '0.2rem 0.6rem',
                fontSize: '0.72rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {doc.stageBadge}
            </span>
          )}
          <span style={{ color: '#948979', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
            Cập nhật: {doc.updatedAt}
          </span>
          <span style={{ color: '#948979', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
            • Thời gian đọc: ~{doc.readingTimeMinutes} phút
          </span>
        </div>

        <p style={{ fontSize: '1rem', color: '#948979', lineHeight: '1.6', marginBottom: '1.5rem' }}>
          {doc.description}
        </p>

        {/* KEY TAKEAWAYS CALLOUT */}
        <CalloutNote type="important" title="Ghi Chú Kỹ Thuật Trọng Điểm (Key Takeaways)">
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {doc.keyTakeaways.map((point, idx) => (
              <li key={idx} style={{ color: '#DFD0B8' }}>
                {point}
              </li>
            ))}
          </ul>
        </CalloutNote>

        {/* NỘI DUNG CHI TIẾT */}
        <div style={{ marginTop: '2rem', color: '#DFD0B8', lineHeight: '1.7', fontSize: '0.92rem' }}>
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
                    fontSize: '1.35rem',
                    fontWeight: 900,
                    color: '#DFD0B8',
                    fontFamily: 'var(--font-mono)',
                    marginTop: '2.5rem',
                    marginBottom: '1rem',
                    borderBottom: '2px solid #948979',
                    paddingBottom: '0.5rem',
                  }}
                >
                  // {title}
                </h2>
              );
            }

            if (trimmed.startsWith('- ')) {
              const items = trimmed.split('\n').filter((l) => l.startsWith('- '));
              return (
                <ul key={idx} style={{ margin: '0.75rem 0', paddingLeft: '1.25rem' }}>
                  {items.map((it, itIdx) => (
                    <li key={itIdx} style={{ marginBottom: '0.35rem', color: '#DFD0B8' }}>
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
                    backgroundColor: '#222831',
                    padding: '1rem',
                    border: '2px solid #948979',
                    boxShadow: '3px 3px 0px #948979',
                    overflowX: 'auto',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    color: '#DFD0B8',
                    margin: '1.25rem 0',
                  }}
                >
                  <code>{codeContent}</code>
                </pre>
              );
            }

            return (
              <p key={idx} style={{ marginBottom: '1rem', color: '#DFD0B8' }}>
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
            borderTop: '2px solid #948979',
          }}
        >
          {prevDoc ? (
            <Link
              href={`/docs/${prevDoc.category}/${prevDoc.slug}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                textDecoration: 'none',
                color: '#948979',
                backgroundColor: '#393E46',
                border: '1px solid #948979',
                padding: '0.75rem 1rem',
                boxShadow: '2px 2px 0px #948979',
              }}
            >
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#948979', fontFamily: 'var(--font-mono)' }}>
                &larr; BÀI TRƯỚC
              </span>
              <span style={{ fontWeight: 800, color: '#DFD0B8', fontSize: '0.88rem', fontFamily: 'var(--font-mono)' }}>
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
                color: '#948979',
                backgroundColor: '#393E46',
                border: '1px solid #948979',
                padding: '0.75rem 1rem',
                boxShadow: '2px 2px 0px #948979',
              }}
            >
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#948979', fontFamily: 'var(--font-mono)' }}>
                BÀI TIẾP THEO &rarr;
              </span>
              <span style={{ fontWeight: 800, color: '#DFD0B8', fontSize: '0.88rem', fontFamily: 'var(--font-mono)' }}>
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
