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

const DEFAULT_SPACES: Space[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    slug: 'devops-arch',
    name: 'DevOps Architecture',
    description: 'Không gian chuyên sâu về thiết kế hệ thống và DevOps hạ tầng.',
    rules: [],
    isPrivate: false,
    creatorId: '00000000-0000-0000-0000-000000000001',
    membersCount: 1240,
    threadsCount: 25,
    isJoined: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    slug: 'vozforums',
    name: 'Voz Forums',
    description: 'Cộng đồng thảo luận công nghệ và lập trình tự do.',
    rules: [],
    isPrivate: false,
    creatorId: '00000000-0000-0000-0000-000000000001',
    membersCount: 3890,
    threadsCount: 112,
    isJoined: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    slug: 'kubernetes',
    name: 'Kubernetes & Cloud Native',
    description: 'Thảo luận k8s, microservices, service mesh và observability.',
    rules: [],
    isPrivate: false,
    creatorId: '00000000-0000-0000-0000-000000000001',
    membersCount: 950,
    threadsCount: 18,
    isJoined: false,
    createdAt: new Date().toISOString(),
  },
];

function SubmitContent() {
  const searchParams = useSearchParams();
  const initialSpaceSlug = searchParams.get('space') || 'devops-arch';
  const [spaces, setSpaces] = useState<Space[]>(DEFAULT_SPACES);

  useEffect(() => {
    async function fetchSpaces() {
      try {
        const loaded = await CommunityApi.getSpaces(50, 0);
        if (loaded && loaded.length > 0) {
          setSpaces(loaded);
        }
      } catch {
        // Keep default spaces
      }
    }
    fetchSpaces();
  }, []);

  return (
    <div style={{ maxWidth: '780px', width: '100%', margin: '0 auto' }}>
      <RichEditor spaces={spaces} initialSpaceSlug={initialSpaceSlug} />
    </div>
  );
}

export default function SubmitPage() {
  return (
    <div className="app-shell">
      <Header />

      <div className="app-body">
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
