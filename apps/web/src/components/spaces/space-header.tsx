'use client';

import type { Space } from '@acad/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { CommunityApi } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';

interface SpaceHeaderProps {
  space: Space;
  activeTab: 'posts' | 'about';
  onTabChange: (tab: 'posts' | 'about') => void;
}

export function SpaceHeader({ space, activeTab, onTabChange }: SpaceHeaderProps) {
  const { user, openAuthModal } = useAuth();
  const [isJoined, setIsJoined] = useState(Boolean(space.isJoined || space.myRole));
  const [memberCount, setMemberCount] = useState<number>(space.membersCount || 1);
  const [isPending, setIsPending] = useState(false);

  const handleJoinToggle = async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    if (isPending) return;

    // Optimistic Update trong 0ms
    const nextState = !isJoined;
    setIsJoined(nextState);
    setMemberCount((prev: number) => (nextState ? prev + 1 : Math.max(1, prev - 1)));
    setIsPending(true);

    try {
      if (nextState) {
        await CommunityApi.joinSpace(space.slug);
      } else {
        await CommunityApi.leaveSpace(space.slug);
      }
    } catch {
      // Hoàn tác nếu máy chủ trả lỗi
      setIsJoined(!nextState);
      setMemberCount((prev: number) => (nextState ? Math.max(1, prev - 1) : prev + 1));
    } finally {
      setIsPending(false);
    }
  };

  const initialLetter = space.name?.charAt(0).toUpperCase() || 'S';

  return (
    <div
      style={{
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
        marginBottom: '20px',
      }}
    >
      {/* Banner Vùng Đỉnh */}
      <div
        style={{
          height: '110px',
          background: 'linear-gradient(135deg, #090a0f 0%, #171d2b 50%, #0c232d 100%)',
          position: 'relative',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.15,
            backgroundImage:
              'radial-gradient(#06b6d4 1px, transparent 1px), radial-gradient(#10b981 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 10px 10px',
          }}
        />
      </div>

      {/* Thông tin Nhận diện Không Gian */}
      <div style={{ padding: '0 24px 16px 24px', position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginTop: '-40px',
          }}
        >
          {/* Avatar & Title */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                backgroundColor: '#12151f',
                border: '3px solid #06b6d4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 900,
                color: '#f8fafc',
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.25)',
              }}
            >
              {initialLetter}
            </div>

            <div style={{ paddingBottom: '4px' }}>
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                {space.name || space.slug}
              </h1>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '4px',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--color-brand)',
                  }}
                >
                  s/{space.slug}
                </span>
                <span style={{ color: 'var(--border-subtle)' }}>•</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {memberCount.toLocaleString()}
                  </strong>{' '}
                  thành viên
                </span>
                <span style={{ color: 'var(--border-subtle)' }}>•</span>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-success)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span className="online-pulse" style={{ width: '6px', height: '6px' }} />
                  Đang hoạt động
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Join & Create Post */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleJoinToggle}
              disabled={isPending}
              style={{
                padding: '8px 20px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isPending ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: isJoined ? 'transparent' : 'var(--color-brand)',
                color: isJoined ? 'var(--text-primary)' : '#090a0f',
                border: isJoined ? '1px solid var(--border-strong)' : 'none',
              }}
            >
              {isJoined ? 'Đã tham gia' : '+ Tham gia'}
            </button>

            <Link
              href={`/submit?space=${space.slug}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                backgroundColor: 'rgba(6, 182, 212, 0.12)',
                color: 'var(--color-brand)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
              }}
            >
              <span>+</span>
              <span>Tạo bài viết</span>
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderTop: '1px solid var(--border-subtle)',
            marginTop: '20px',
            paddingTop: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => onTabChange('posts')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: activeTab === 'posts' ? 700 : 500,
              color: activeTab === 'posts' ? 'var(--color-brand)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'posts' ? '2px solid var(--color-brand)' : 'none',
              cursor: 'pointer',
            }}
          >
            Bài viết
          </button>
          <button
            type="button"
            onClick={() => onTabChange('about')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: activeTab === 'about' ? 700 : 500,
              color: activeTab === 'about' ? 'var(--color-brand)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'about' ? '2px solid var(--color-brand)' : 'none',
              cursor: 'pointer',
            }}
          >
            Giới thiệu & Nội quy
          </button>
        </div>
      </div>
    </div>
  );
}
