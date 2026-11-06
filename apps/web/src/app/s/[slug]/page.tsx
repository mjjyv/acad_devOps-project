'use client';

import type { Space, SpaceFlair } from '@acad/contracts';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FloatingChatWidget } from '@/components/chat/floating-chat-widget';
import { PostCard, type PostItem } from '@/components/feed/post-card';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { SpaceHeader } from '@/components/spaces/space-header';
import { SpaceSidebar } from '@/components/spaces/space-sidebar';
import { CommunityApi } from '@/lib/api/community';

export default function SpacePage() {
  const params = useParams();
  const slug = (params?.slug as string) || 'devops-arch';

  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');
  const [selectedFlairId, setSelectedFlairId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const [space, setSpace] = useState<Space>({
    id: '00000000-0000-0000-0000-000000000001',
    slug,
    name: slug === 'devops-arch' ? 'DevOps Architecture' : slug.toUpperCase(),
    description: 'Không gian chuyên sâu về thiết kế hệ thống, DevOps hạ tầng và phân tán.',
    isPrivate: false,
    creatorId: '00000000-0000-0000-0000-000000000002',
    membersCount: 1240,
    threadsCount: 25,
    isJoined: false,
    rules: [
      {
        title: 'Tôn trọng thành viên',
        description: 'Tranh luận kỹ thuật văn minh, không công kích cá nhân.',
      },
      {
        title: 'Bảo mật thông tin',
        description: 'Không chia sẻ secret key, token hoặc dữ liệu nội bộ production.',
      },
    ],
    createdAt: new Date().toISOString(),
  });

  const [flairs, setFlairs] = useState<SpaceFlair[]>([
    {
      id: '00000000-0000-0000-0000-000000000011',
      spaceId: '00000000-0000-0000-0000-000000000001',
      name: 'Architecture',
      slug: 'architecture',
      colorHex: '#06b6d4',
      backgroundHex: '#12151f',
      createdAt: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0000-000000000012',
      spaceId: '00000000-0000-0000-0000-000000000001',
      name: 'DevOps',
      slug: 'devops',
      colorHex: '#10b981',
      backgroundHex: '#12151f',
      createdAt: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0000-000000000013',
      spaceId: '00000000-0000-0000-0000-000000000001',
      name: 'Q&A',
      slug: 'qa',
      colorHex: '#f59e0b',
      backgroundHex: '#12151f',
      createdAt: new Date().toISOString(),
    },
  ]);

  const [posts, setPosts] = useState<PostItem[]>([
    {
      id: 'thread-sample-1',
      spaceSlug: slug,
      spaceName: `s/${slug}`,
      spaceColor: '#10b981',
      author: 'lead_architect',
      timeAgo: '2 hr. ago',
      title: `Tổng quan kiến trúc phân tán và kinh nghiệm vận hành tại s/${slug}`,
      bodySnippet:
        'Hệ thống microservices với Event-driven architecture, sử dụng Redis Lua scripts cho bộ đếm karma nguyên tử và Postgres ltree cho cây bình luận đa tầng...',
      upvotes: 245,
      comments: 38,
      hasJoined: true,
    },
    {
      id: 'thread-sample-2',
      spaceSlug: slug,
      spaceName: `s/${slug}`,
      spaceColor: '#06b6d4',
      author: 'devops_ninja',
      timeAgo: '5 hr. ago',
      title: 'Tự động hóa CI/CD và triển khai Cloudflare Zero Trust Tunnel cho Homelab',
      bodySnippet:
        'Bảo mật tuyệt đối hạ tầng máy chủ cục bộ, không mở port NAT router, quản lý qua systemd user service và Podman rootless isolation...',
      upvotes: 182,
      comments: 19,
      hasJoined: true,
    },
  ]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const data = await CommunityApi.getSpace(slug);
        if (isMounted && data.space) {
          setSpace(data.space);
          if (data.flairs && data.flairs.length > 0) {
            setFlairs(data.flairs);
          }
        }
      } catch {
        // Use default fallback space
      }

      try {
        const threadList = await CommunityApi.getSpaceThreads(slug);
        if (isMounted && threadList && threadList.length > 0) {
          const mapped: PostItem[] = threadList.map((t) => ({
            id: t.id,
            spaceSlug: t.spaceSlug,
            spaceName: `s/${t.spaceSlug}`,
            spaceColor: '#06b6d4',
            author: t.authorUsername,
            timeAgo: 'Vừa xong',
            title: t.title,
            bodySnippet: '',
            upvotes: t.netScore,
            comments: t.commentsCount,
            userVote: t.userVote === 1 ? 1 : t.userVote === -1 ? -1 : null,
          }));
          setPosts(mapped);
        }
      } catch {
        // Fallback to sample posts
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  return (
    <div className="app-shell">
      <Header />

      <div className="app-container">
        <LeftSidebar />

        <main className="main-content" style={{ maxWidth: '1060px' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            {/* Cột Chính */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <SpaceHeader space={space} activeTab={activeTab} onTabChange={setActiveTab} />

              {activeTab === 'posts' ? (
                <div>
                  {loading && posts.length === 0 ? (
                    <div
                      style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}
                    >
                      Đang tải bài viết của không gian...
                    </div>
                  ) : (
                    posts.map((post) => <PostCard key={post.id} post={post} />)
                  )}
                </div>
              ) : (
                /* Tab Giới thiệu & Nội quy */
                <div
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    padding: '24px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      margin: '0 0 12px 0',
                    }}
                  >
                    Về Không Gian s/{space.slug}
                  </h3>
                  <p
                    style={{
                      fontSize: '14px',
                      lineHeight: 1.6,
                      color: 'var(--text-secondary)',
                      marginBottom: '20px',
                    }}
                  >
                    {space.description || 'Không gian thảo luận chuyên sâu trên nền tảng SYNAPSE.'}
                  </p>

                  <h4
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      margin: '20px 0 10px 0',
                    }}
                  >
                    Nội Quy Quy Định
                  </h4>
                  {space.rules && space.rules.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {space.rules.map((rule, idx) => (
                        <div
                          key={rule.title}
                          style={{
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-subtle)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              fontSize: '13px',
                            }}
                          >
                            {idx + 1}. {rule.title}
                          </div>
                          {rule.description && (
                            <div
                              style={{
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                marginTop: '4px',
                              }}
                            >
                              {rule.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      Chưa có nội quy cụ thể. Vui lòng tuân thủ quy chuẩn ứng xử chung của nền tảng.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cột Phải Đặc Thù Không Gian */}
            <div className="desktop-only-rail">
              <SpaceSidebar
                space={space}
                flairs={flairs}
                selectedFlairId={selectedFlairId}
                onSelectFlair={setSelectedFlairId}
              />
            </div>
          </div>
        </main>
      </div>

      <FloatingChatWidget />
      <BottomNav />
    </div>
  );
}
