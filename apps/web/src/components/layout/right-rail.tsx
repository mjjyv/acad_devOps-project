'use client';

import type { Space, ThreadSummary } from '@acad/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CommunityApi } from '@/lib/api/community';

export function RightRail() {
  const [topSpaces, setTopSpaces] = useState<Space[]>([]);
  const [recentThreads, setRecentThreads] = useState<ThreadSummary[]>([]);

  useEffect(() => {
    let active = true;
    async function loadRail() {
      try {
        const [spacesRes, threadsRes] = await Promise.all([
          CommunityApi.getSpaces(5, 0),
          CommunityApi.getPopularFeed({ sort: 'new', limit: 5 }),
        ]);
        if (active) {
          setTopSpaces(spacesRes);
          setRecentThreads(threadsRes.items);
        }
      } catch {
        // ignore transient errors on auxiliary rail
      }
    }
    void loadRail();
    return () => {
      active = false;
    };
  }, []);

  return (
    <aside className="app-right-rail" aria-label="Bảng tin phụ">
      <div
        className="surface-card"
        style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        <h3
          style={{
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
          }}
        >
          Không gian nổi bật
        </h3>
        {topSpaces.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chưa có dữ liệu.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topSpaces.map((s) => (
              <Link
                key={s.id}
                href={`/s/${s.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>s/{s.slug}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.topic}</div>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-brand)', fontWeight: 600 }}>
                  {s.membersCount} thành viên
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div
        className="surface-card"
        style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        <h3
          style={{
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
          }}
        >
          Bài viết mới nhất
        </h3>
        {recentThreads.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chưa có bài viết.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentThreads.map((t) => (
              <Link
                key={t.id}
                href={`/threads/${t.id}`}
                style={{
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--border-divider)',
                  paddingBottom: '8px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  s/{t.spaceSlug} · {t.netScore} điểm · {t.commentsCount} bình luận
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
