'use client';

import type { Space } from '@acad/contracts';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { FloatingChatWidget } from '@/components/chat/floating-chat-widget';
import { RichEditor } from '@/components/editor/rich-editor';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { CommunityApi } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';

function SubmitContent() {
  const searchParams = useSearchParams();
  const initialSpaceSlug = searchParams.get('space') || '';
  const { isAuthenticated } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    void isAuthenticated;
    let isMounted = true;
    async function fetchSpaces() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const loaded = await CommunityApi.getSpaces(50, 0);
        if (isMounted) {
          setSpaces(loaded);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMsg(err instanceof Error ? err.message : 'Không thể tải danh sách không gian');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    fetchSpaces();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>
        Đang tải danh sách không gian thảo luận...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div
        className="reddit-card"
        style={{ padding: '24px', textAlign: 'center', color: '#f43f5e' }}
      >
        {errorMsg}
      </div>
    );
  }

  if (spaces.length === 0) {
    return (
      <div
        className="reddit-card"
        style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}
      >
        Chưa có không gian thảo luận nào khả dụng để đăng bài.
      </div>
    );
  }

  const effectiveSlug = initialSpaceSlug || spaces[0]?.slug || '';

  return (
    <div style={{ maxWidth: '780px', width: '100%', margin: '0 auto' }}>
      <RichEditor spaces={spaces} initialSpaceSlug={effectiveSlug} />
    </div>
  );
}

export default function SubmitPage() {
  return (
    <div className="app-shell">
      <Header />

      <div className="app-container">
        <LeftSidebar />

        <main className="main-content" style={{ maxWidth: '820px' }}>
          <Suspense
            fallback={
              <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
                Đang tải trình soạn thảo...
              </div>
            }
          >
            <SubmitContent />
          </Suspense>
        </main>
      </div>

      <FloatingChatWidget />
      <BottomNav />
    </div>
  );
}
