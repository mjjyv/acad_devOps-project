'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Navbar } from '../../../components/navbar';
import { useAuth } from '../../../contexts/auth-context';
import { communityClient } from '../../../lib/community-client';
import { Space, ThreadSummary } from '@acad/contracts';

export default function SpaceDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { user } = useAuth();

  const [space, setSpace] = useState<Space | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selectedSort, setSelectedSort] = useState<'hot' | 'new' | 'top'>('hot');
  const [isLoading, setIsLoading] = useState(true);
  const [isJoined, setIsJoined] = useState(false);

  const loadData = async () => {
    if (!slug) return;
    setIsLoading(true);
    try {
      const [spaceData, threadsData] = await Promise.all([
        communityClient.getSpace(slug),
        communityClient.fetchThreads({
          spaceSlug: slug,
          sort: selectedSort,
        }),
      ]);
      setSpace(spaceData);
      setThreads(threadsData.items);
    } catch (err) {
      console.error('Error fetching space data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [slug, selectedSort]);

  const handleToggleJoin = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập để tham gia không gian!');
      return;
    }
    if (!space) return;

    try {
      if (isJoined) {
        await communityClient.leaveSpace(space.slug);
        setIsJoined(false);
        setSpace((prev) => (prev ? { ...prev, memberCount: Math.max(0, prev.memberCount - 1) } : null));
      } else {
        await communityClient.joinSpace(space.slug);
        setIsJoined(true);
        setSpace((prev) => (prev ? { ...prev, memberCount: prev.memberCount + 1 } : null));
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi thao tác');
    }
  };

  if (isLoading) {
    return (
      <div style={{ backgroundColor: '#222831', minHeight: '100vh', color: '#DFD0B8' }}>
        <Navbar />
        <div style={{ maxWidth: '960px', margin: '4rem auto', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          // ĐANG TẢI THÔNG TIN KHÔNG GIAN...
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div style={{ backgroundColor: '#222831', minHeight: '100vh', color: '#DFD0B8' }}>
        <Navbar />
        <div style={{ maxWidth: '960px', margin: '4rem auto', padding: '2rem', backgroundColor: '#393E46', border: '2px solid #D96B6B' }}>
          <h2 style={{ color: '#D96B6B', margin: '0 0 1rem 0' }}>[LỖI]: Không tìm thấy không gian &apos;s/{slug}&apos;</h2>
          <Link href="/" style={{ color: '#DFD0B8', textDecoration: 'underline', fontWeight: 700 }}>
            ← Quay lại Trang Chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#222831', minHeight: '100vh', color: '#DFD0B8' }}>
      <Navbar />

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
        {/* LEFT COLUMN: SPACE THREADS */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Header Banner */}
          <div
            style={{
              backgroundColor: '#393E46',
              border: '2px solid #948979',
              boxShadow: '4px 4px 0px #948979',
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#948979', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
                KHÔNG GIAN CHUYÊN SÂU
              </div>
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#DFD0B8' }}>
                s/{space.slug}
              </h1>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: '#B3AAA0' }}>
                {space.description || space.name}
              </p>
            </div>

            <button
              onClick={handleToggleJoin}
              style={{
                padding: '0.55rem 1.25rem',
                backgroundColor: isJoined ? '#222831' : '#DFD0B8',
                color: isJoined ? '#DFD0B8' : '#222831',
                border: isJoined ? '2px solid #948979' : '2px solid #DFD0B8',
                fontWeight: 900,
                fontSize: '0.85rem',
                boxShadow: '3px 3px 0px #948979',
                cursor: 'pointer',
              }}
            >
              {isJoined ? 'ĐÃ THAM GIA' : '+ GIA NHẬP'}
            </button>
          </div>

          {/* Sort Controls */}
          <div
            style={{
              backgroundColor: '#393E46',
              border: '2px solid #948979',
              padding: '0.65rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['hot', 'new', 'top'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedSort(tab)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    backgroundColor: selectedSort === tab ? '#DFD0B8' : '#222831',
                    color: selectedSort === tab ? '#222831' : '#DFD0B8',
                    border: '1px solid #948979',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  {tab === 'hot' ? 'THỊNH HÀNH' : tab === 'new' ? 'MỚI NHẤT' : 'ĐIỂM CAO'}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#948979', fontFamily: 'var(--font-mono)' }}>
              {threads.length} BÀI VIẾT
            </div>
          </div>

          {/* Threads List */}
          {threads.length === 0 ? (
            <div style={{ backgroundColor: '#393E46', border: '2px solid #948979', padding: '3rem', textAlign: 'center', color: '#948979' }}>
              Chưa có bài viết nào trong không gian này.
            </div>
          ) : (
            threads.map((thread) => (
              <article
                key={thread.id}
                style={{
                  backgroundColor: '#393E46',
                  border: '2px solid #948979',
                  boxShadow: '3px 3px 0px #948979',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#948979' }}>
                  Đăng bởi u/{thread.authorUsername} • {new Date(thread.createdAt).toLocaleDateString('vi-VN')}
                </div>
                <Link
                  href={`/threads/${thread.slug}`}
                  style={{ fontSize: '1.15rem', fontWeight: 800, color: '#DFD0B8', textDecoration: 'none' }}
                >
                  {thread.title}
                </Link>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#B3AAA0' }}>
                  {thread.snippet}
                </p>
                <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid #444A54', paddingTop: '0.5rem', marginTop: '0.5rem', fontSize: '0.78rem', color: '#948979' }}>
                  <span>ĐIỂM: {thread.counters.netScore}</span>
                  <span>BÌNH LUẬN: {thread.counters.commentCount}</span>
                </div>
              </article>
            ))
          )}
        </section>

        {/* RIGHT COLUMN: SPACE SIDEBAR */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              backgroundColor: '#393E46',
              border: '2px solid #948979',
              padding: '1.25rem',
              boxShadow: '3px 3px 0px #948979',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#948979', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              // THỐNG KÊ KHÔNG GIAN
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', borderBottom: '1px solid #948979', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#DFD0B8', fontFamily: 'var(--font-mono)' }}>
                  {space.memberCount}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#948979' }}>THÀNH VIÊN</div>
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#DFD0B8', fontFamily: 'var(--font-mono)' }}>
                  {space.threadCount}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#948979' }}>BÀI VIẾT</div>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#948979', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              // NỘI QUY KHÔNG GIAN
            </div>
            {space.rules && space.rules.length > 0 ? (
              <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#B3AAA0', lineHeight: 1.6 }}>
                {space.rules.map((r) => (
                  <li key={r.id}>
                    <strong>{r.title}</strong>: {r.description}
                  </li>
                ))}
              </ol>
            ) : (
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#948979' }}>
                Tuân thủ quy chuẩn chung của nền tảng ACAD DevOps.
              </p>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
