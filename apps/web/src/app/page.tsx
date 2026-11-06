'use client';

import { FloatingChatWidget } from '@/components/chat/floating-chat-widget';
import { FeedHeader } from '@/components/feed/feed-header';
import { PostCard, type PostItem } from '@/components/feed/post-card';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { RightRail } from '@/components/layout/right-rail';

const SAMPLE_POSTS: PostItem[] = [
  {
    id: 'post-1',
    spaceSlug: 'vozforums',
    spaceName: 'Voz Forums',
    spaceColor: '#ff4500',
    author: 'khoaitaychien',
    timeAgo: '4 hr. ago',
    title:
      'Chia sẻ kinh nghiệm phỏng vấn DevOps Engineer và SRE tại các công ty Big Tech & Unicorn',
    bodySnippet:
      'Chào anh em, mình vừa kết thúc chuỗi phỏng vấn ở 4 công ty công nghệ lớn tại VN và Singapore. Muốn chia sẻ lại toàn bộ roadmap ôn tập từ Linux kernel internals, networking TCP/IP, Kubernetes architecture, và deep-dive distributed system...',
    upvotes: 428,
    comments: 89,
    hasJoined: true,
    userVote: null,
  },
  {
    id: 'post-2',
    spaceSlug: 'reviewnganluat',
    spaceName: 'Review Ngành Luật & IT',
    spaceColor: '#3b82f6',
    author: 'lawyer_tech',
    timeAgo: '6 hr. ago',
    title:
      'Quy định mới về bảo vệ dữ liệu cá nhân Nghị định 13 và tác động trực tiếp đến kiến trúc lưu trữ log hệ thống',
    bodySnippet:
      'Đối với các hệ thống backend có ghi nhận IP, cookie tracking hoặc thông tin người dùng, việc lưu trữ plain text trong PostgreSQL hay Elasticsearch có thể đối mặt với rủi ro pháp lý cao. Bài viết này phân tích phương án mã hóa cột AES-GCM 256 và chính sách data retention tự động...',
    upvotes: 185,
    comments: 34,
    hasJoined: false,
    userVote: 1,
  },
  {
    id: 'post-3',
    spaceSlug: 'devops-arch',
    spaceName: 'DevOps Architecture',
    spaceColor: '#10b981',
    author: 'cloud_architect',
    timeAgo: '12 hr. ago',
    title:
      'Triển khai Self-Hosted Homelab Monorepo: Podman Rootless, Cloudflare Tunnel và Next.js 15 SSR High Availability',
    bodySnippet:
      'Tối ưu hóa tài nguyên phần cứng, triệt tiêu chi phí Cloud đắt đỏ với mô hình Zero Trust Cloudflare Tunnel kết hợp Systemd User Daemons và PostgreSQL 16 ltree nested tree CMS. Giảm 100% latency qua mạng công cộng và đảm bảo bảo mật dữ liệu tuyệt đối tại chỗ.',
    upvotes: 562,
    comments: 112,
    hasJoined: true,
    userVote: null,
  },
  {
    id: 'post-4',
    spaceSlug: 'kubernetes',
    spaceName: 'Kubernetes Vietnam',
    spaceColor: '#6366f1',
    author: 'k8s_master',
    timeAgo: '1 day ago',
    title: 'Debug hiện tượng Pod OOMKilled bí ẩn khi Node vẫn còn dư 40% RAM - Do đâu?',
    bodySnippet:
      'Cần phân biệt rõ giữa Container Memory Limit trong cgroup v2 và Node Memory Allocatable. Khi Page Cache và Dirty Pages tăng vọt trong các tác vụ disk I/O nặng mà không được giải phóng kịp thời, kernel oom-killer sẽ kích hoạt tiêu diệt process...',
    upvotes: 310,
    comments: 57,
    hasJoined: false,
    userVote: null,
  },
];

export default function HomePage() {
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
            {SAMPLE_POSTS.map((post) => (
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
