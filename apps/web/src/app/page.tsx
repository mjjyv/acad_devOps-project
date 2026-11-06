'use client';

import { useEffect, useState } from 'react';
import { FloatingChatWidget } from '@/components/chat/floating-chat-widget';
import { FeedHeader } from '@/components/feed/feed-header';
import { PostCard, type PostItem } from '@/components/feed/post-card';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { RightRail } from '@/components/layout/right-rail';
import { CommunityApi } from '@/lib/api/community';

const INITIAL_POSTS: PostItem[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    spaceSlug: 'devops-arch',
    spaceName: 's/devops-arch',
    spaceColor: '#E1D9BC',
    author: 'cloud_architect',
    timeAgo: '3 ngày trước',
    title:
      'Triển khai Self-Hosted Homelab Monorepo: Podman Rootless, Cloudflare Tunnel và Next.js 15 SSR High Availability',
    bodySnippet:
      'Tối ưu hóa tài nguyên phần cứng, triệt tiêu chi phí Cloud đắt đỏ với mô hình Zero Trust Cloudflare Tunnel kết hợp Systemd User Daemons và PostgreSQL 16 ltree nested tree CMS. Giảm 100% rủi ro bị tấn công trực diện vào IP công cộng...',
    upvotes: 562,
    comments: 6,
    hasJoined: false,
    userVote: null,
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    spaceSlug: 'vozforums',
    spaceName: 's/vozforums',
    spaceColor: '#ACBAC4',
    author: 'khoaitaychien',
    timeAgo: '2 ngày trước',
    title:
      'Chia sẻ kinh nghiệm phỏng vấn DevOps Engineer và SRE tại các công ty Big Tech & Unicorn',
    bodySnippet:
      'Chào anh em, mình vừa kết thúc chuỗi phỏng vấn ở 4 công ty công nghệ lớn tại VN và Singapore. Muốn chia sẻ lại toàn bộ roadmap ôn tập từ Linux kernel internals, networking TCP/IP, Kubernetes architecture, và deep-dive distributed system...',
    upvotes: 428,
    comments: 3,
    hasJoined: false,
    userVote: null,
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    spaceSlug: 'system-design',
    spaceName: 's/system-design',
    spaceColor: '#E1D9BC',
    author: 'devops_ninja',
    timeAgo: '1 ngày trước',
    title:
      'Deep-dive PostgreSQL 16 ltree: Cấu trúc cây bình luận đệ quy tối ưu hóa cho hàng triệu nút',
    bodySnippet:
      'Tại sao Reddit và các diễn đàn lớn chuyển từ Recursive CTE sang Materialized Path ltree? Phân tích mã hóa Base36, GiST index dưới 1.2ms và chiến lược Capped Depth cho giao diện di động...',
    upvotes: 315,
    comments: 2,
    hasJoined: false,
    userVote: null,
  },
  {
    id: 'd0000000-0000-0000-0000-000000000004',
    spaceSlug: 'kubernetes',
    spaceName: 's/kubernetes',
    spaceColor: '#ACBAC4',
    author: 'sre_expert',
    timeAgo: '18 giờ trước',
    title: 'Chiến lược bộ đếm Karma và Vote FSM nguyên tử với Redis Lua Scripts',
    bodySnippet:
      'Giải quyết bài toán Race Condition khi có 5,000 lượt upvote/downvote đồng thời trên cùng một bài viết kỹ thuật. Triển khai Redis Lua Scripts chạy đơn luồng nguyên tử kết hợp PostgreSQL HOT update...',
    upvotes: 289,
    comments: 1,
    hasJoined: false,
    userVote: null,
  },
  {
    id: 'd0000000-0000-0000-0000-000000000005',
    spaceSlug: 'security-shield',
    spaceName: 's/security-shield',
    spaceColor: '#F0F0DB',
    author: 'lawyer_tech',
    timeAgo: '12 giờ trước',
    title:
      'Quy định mới về bảo vệ dữ liệu cá nhân Nghị định 13 và tác động trực tiếp đến kiến trúc lưu trữ log hệ thống',
    bodySnippet:
      'Đối với các hệ thống backend có ghi nhận IP, cookie tracking hoặc thông tin người dùng, việc lưu trữ plain text trong PostgreSQL hay Elasticsearch có thể đối mặt với rủi ro pháp lý cao theo Nghị định 13...',
    upvotes: 195,
    comments: 1,
    hasJoined: false,
    userVote: 1,
  },
];

export default function HomePage() {
  const [posts, setPosts] = useState<PostItem[]>(INITIAL_POSTS);

  useEffect(() => {
    let isMounted = true;
    async function fetchLiveFeed() {
      try {
        const liveThreads = await CommunityApi.getPopularFeed(20);
        if (isMounted && liveThreads && liveThreads.length > 0) {
          const mapped: PostItem[] = liveThreads.map((t) => ({
            id: t.id,
            spaceSlug: t.spaceSlug || 'devops-arch',
            spaceName: `s/${t.spaceSlug || 'devops-arch'}`,
            spaceColor: t.flair?.colorHex || '#E1D9BC',
            author: t.authorUsername || 'cloud_architect',
            timeAgo: new Date(t.createdAt).toLocaleDateString('vi-VN'),
            title: t.title,
            bodySnippet:
              'contentText' in t && typeof t.contentText === 'string'
                ? `${t.contentText.slice(0, 180)}...`
                : '',
            upvotes: t.netScore ?? t.upvotes ?? 0,
            comments: t.commentsCount,
            hasJoined: false,
            userVote: t.userVote === 1 ? 1 : t.userVote === -1 ? -1 : null,
          }));
          setPosts(mapped);
        }
      } catch {
        // Fallback to initial realistic seed posts
      }
    }
    fetchLiveFeed();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="app-shell">
      {/* 1. Sticky Navigation Header */}
      <Header />

      {/* 2. Holy Grail 3-Column Layout */}
      <div className="app-container">
        {/* Left Sidebar (260px) */}
        <LeftSidebar />

        {/* Center Main Feed Stream (max 680px) */}
        <main
          style={{
            flex: 1,
            maxWidth: 'var(--feed-max-width)',
            minWidth: 0,
            width: '100%',
          }}
        >
          {/* Feed Header (Tabs: For You/Following, Sorters: Hot/New/Top/Best, View Modes) */}
          <FeedHeader />

          {/* Posts Stream */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </main>

        {/* Right Rail Contextual Widget (316px) */}
        <RightRail />
      </div>

      {/* 3. Mobile Navigation Bottom Bar (< 768px) */}
      <BottomNav />

      {/* 4. Realtime Floating Chat Widget (Bottom Right Pill / Docked Modal) */}
      <FloatingChatWidget />
    </div>
  );
}
