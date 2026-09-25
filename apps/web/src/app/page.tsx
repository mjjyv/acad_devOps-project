'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../components/navbar';
import { useAuth } from '../contexts/auth-context';

interface Post {
  id: string;
  author: {
    name: string;
    username: string;
    avatarInitials: string;
    karma: number;
    badge?: string;
  };
  space: {
    id: string;
    name: string;
    label: string;
  };
  createdAt: string;
  title: string;
  summary: string;
  codeSnippet?: {
    language: string;
    code: string;
  };
  tags: string[];
  votes: number;
  commentsCount: number;
  userVote?: 'up' | 'down' | null;
}

const INITIAL_POSTS: Post[] = [
  {
    id: 'post-1',
    author: {
      name: 'Nguyễn Tiến Dũng',
      username: 'dung_architect',
      avatarInitials: 'ND',
      karma: 1420,
      badge: 'Senior Architect',
    },
    space: {
      id: 'system-design',
      name: 's/system-design',
      label: 'Kiến Trúc Hệ Thống',
    },
    createdAt: '2 giờ trước',
    title: 'Tối ưu hóa cây phân cấp bình luận vô hạn bằng PostgreSQL ltree và GIST Index trong môi trường đọc tải cao',
    summary:
      'Trong hệ thống thảo luận phân cấp vô hạn, việc sử dụng recursive CTE thông thường dẫn đến IO bottle-neck nghiêm trọng khi luồng bình luận vượt ngưỡng 10.000 nodes. Chúng tôi đã di chuyển cấu trúc sang PostgreSQL ltree với GIST index, giúp câu truy vấn cây con thực thi trong dưới 1.2ms.',
    codeSnippet: {
      language: 'sql',
      code: `CREATE INDEX idx_comments_path_gist ON comments USING GIST (path);
-- Truy vấn toàn bộ cây con của nhánh 001.002 với độ sâu tùy biến
SELECT id, path, nlevel(path) AS depth, content, karma_score
FROM comments
WHERE path <@ 'root.post_89.c_102'
ORDER BY path ASC;`,
    },
    tags: ['PostgreSQL', 'ltree', 'Indexing', 'HighConcurrency'],
    votes: 148,
    commentsCount: 38,
  },
  {
    id: 'post-2',
    author: {
      name: 'Trần Minh Quân',
      username: 'quan_devops',
      avatarInitials: 'TQ',
      karma: 890,
      badge: 'Platform Engineer',
    },
    space: {
      id: 'docker-k8s',
      name: 's/docker-k8s',
      label: 'Containers & K8s',
    },
    createdAt: '4 giờ trước',
    title: 'Multi-stage Dockerfile cho Node.js Monorepo: Giảm kích thước image từ 1.2GB xuống 84MB bằng Alpine & PNPM Trimming',
    summary:
      'Chia sẻ quy chuẩn Dockerfile multi-stage tận dụng cache mount của BuildKit (`--mount=type=cache,id=pnpm`) và kỹ thuật isolated deploy của pnpm để tạo production container tối giản, giảm thiểu attack surface cho các microservices.',
    codeSnippet: {
      language: 'dockerfile',
      code: `FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \\
    adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]`,
    },
    tags: ['Docker', 'Alpine', 'pnpm', 'Monorepo', 'CI-CD'],
    votes: 95,
    commentsCount: 24,
  },
  {
    id: 'post-3',
    author: {
      name: 'Lê Hoàng Nam',
      username: 'nam_security',
      avatarInitials: 'LN',
      karma: 670,
      badge: 'Security Lead',
    },
    space: {
      id: 'security-auth',
      name: 's/security-auth',
      label: 'Bảo Mật & Định Danh',
    },
    createdAt: '6 giờ trước',
    title: 'Phòng thủ Brute-force & Token Hijacking: Kết hợp Argon2id, Token Rotation và Redis Sliding Window',
    summary:
      'Chi tiết thiết kế tầng bảo vệ Auth Subsystem: Token Rotation một lần (Single-use Refresh Token) giúp phát hiện token bị đánh cắp ngay lập tức, tự động thu hồi toàn bộ phiên đăng nhập gia đình liên quan kèm rate limiting 10 req/15min.',
    tags: ['Auth', 'Argon2id', 'Redis', 'SlidingWindow', 'JWT'],
    votes: 81,
    commentsCount: 16,
  },
];

const SPACES = [
  { id: 'all', name: 'Tất cả chủ đề', code: 'explore', count: '1.4k' },
  { id: 'devops-infra', name: 'DevOps & Hạ Tầng', code: 's/devops-infra', count: '542' },
  { id: 'docker-k8s', name: 'Docker & Kubernetes', code: 's/docker-k8s', count: '389' },
  { id: 'system-design', name: 'Kiến Trúc Hệ Thống', code: 's/system-design', count: '412' },
  { id: 'security-auth', name: 'Bảo Mật & Auth', code: 's/security-auth', count: '275' },
  { id: 'ci-cd', name: 'CI/CD & Cloud Native', code: 's/ci-cd', count: '198' },
];

const TOP_CONTRIBUTORS = [
  { name: 'Nguyễn Tiến Dũng', username: 'dung_architect', karma: 1420, role: 'ARCHITECT' },
  { name: 'Trần Minh Quân', username: 'quan_devops', karma: 890, role: 'DEVOPS' },
  { name: 'Lê Hoàng Nam', username: 'nam_security', karma: 670, role: 'SECURITY' },
  { name: 'Phạm Thu Trang', username: 'trang_sre', karma: 540, role: 'SRE' },
];

export default function SocialHomePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [selectedSpace, setSelectedSpace] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'latest' | 'top' | 'hot'>('top');
  
  // State khung tạo bài viết
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postSpace, setPostSpace] = useState('s/devops-infra');
  const [isComposing, setIsComposing] = useState(false);

  const handleVote = (postId: string, direction: 'up' | 'down') => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        
        let delta = 0;
        let newVote: 'up' | 'down' | null = direction;

        if (post.userVote === direction) {
          // Hủy vote
          delta = direction === 'up' ? -1 : 1;
          newVote = null;
        } else if (post.userVote) {
          // Đổi chiều vote
          delta = direction === 'up' ? 2 : -2;
        } else {
          // Vote mới
          delta = direction === 'up' ? 1 : -1;
        }

        return {
          ...post,
          votes: post.votes + delta,
          userVote: newVote,
        };
      })
    );
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;

    const newPost: Post = {
      id: `post-${Date.now()}`,
      author: {
        name: user ? user.username : 'Kỹ Sư Khách',
        username: user ? user.username.toLowerCase() : 'guest_engineer',
        avatarInitials: user ? user.username.slice(0, 2).toUpperCase() : 'GE',
        karma: user ? user.karmaScore : 0,
        badge: user?.role === 'ADMIN' ? 'Quản Trị Viên' : 'Kỹ Sư Thành Viên',
      },
      space: {
        id: postSpace.replace('s/', ''),
        name: postSpace,
        label: postSpace.toUpperCase(),
      },
      createdAt: 'Vừa xong',
      title: postTitle,
      summary: postContent,
      tags: ['ThảoLuận', 'KỹThuật'],
      votes: 1,
      commentsCount: 0,
      userVote: 'up',
    };

    setPosts([newPost, ...posts]);
    setPostTitle('');
    setPostContent('');
    setIsComposing(false);
  };

  const filteredPosts = posts.filter((post) => {
    if (selectedSpace === 'all') return true;
    return post.space.id === selectedSpace;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5EFE3', color: '#4A4A4A' }}>
      <Navbar />

      {/* THREE-COLUMN SOCIAL LAYOUT CONTAINER */}
      <div
        style={{
          maxWidth: '1360px',
          margin: '0 auto',
          padding: '1.75rem 1.25rem',
          display: 'grid',
          gridTemplateColumns: '240px minmax(0, 1fr) 310px',
          gap: '1.75rem',
          alignItems: 'start',
        }}
      >
        {/* ========================================================================= */}
        {/* LEFT RAIL: SPACES & CATEGORIES NAVIGATION */}
        {/* ========================================================================= */}
        <aside
          style={{
            position: 'sticky',
            top: '72px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          {/* FEEDS LIST */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E6DFD5',
              padding: '1rem',
            }}
          >
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#787774',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '0.75rem',
              }}
            >
              Luồng Khám Phá
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <button
                onClick={() => setSelectedSpace('all')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: selectedSpace === 'all' ? '#EAF2F1' : 'transparent',
                  color: selectedSpace === 'all' ? '#12544F' : '#4A4A4A',
                  fontWeight: selectedSpace === 'all' ? 700 : 500,
                  fontSize: '0.85rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                  </svg>
                  <span>Toàn bộ thảo luận</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#787774', fontFamily: 'var(--font-mono)' }}>{posts.length}</span>
              </button>

              <button
                onClick={() => setActiveTab('hot')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#4A4A4A',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                  <span>Thịnh hành hôm nay</span>
                </div>
              </button>
            </nav>
          </div>

          {/* SPACES DIRECTORY */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E6DFD5',
              padding: '1rem',
            }}
          >
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#787774',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '0.75rem',
              }}
            >
              Không Gian Thảo Luận
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {SPACES.slice(1).map((space) => (
                <button
                  key={space.id}
                  onClick={() => setSelectedSpace(space.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: selectedSpace === space.id ? '#EAF2F1' : 'transparent',
                    color: selectedSpace === space.id ? '#12544F' : '#4A4A4A',
                    fontWeight: selectedSpace === space.id ? 700 : 500,
                    fontSize: '0.82rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{space.code}</span>
                  <span style={{ fontSize: '0.7rem', color: '#787774' }}>{space.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* DOCUMENTATION SHORTCUT CARD */}
          <div
            style={{
              backgroundColor: '#FAF7F2',
              borderRadius: '8px',
              border: '1px solid #E6DFD5',
              padding: '1rem',
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#12544F', marginBottom: '0.35rem' }}>
              Tài Liệu & Checklist
            </div>
            <p style={{ fontSize: '0.76rem', color: '#787774', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
              Tra cứu 2050 dòng checklist số hóa và tài liệu kiến trúc hệ thống phân tán.
            </p>
            <Link
              href="/docs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#12544F',
                textDecoration: 'none',
              }}
            >
              <span>Xem trang tài liệu</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* CENTER STAGE: SOCIAL FEED & POST COMPOSER */}
        {/* ========================================================================= */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* QUICK POST COMPOSER */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E6DFD5',
              padding: '1.25rem',
            }}
          >
            {!isComposing ? (
              <div
                onClick={() => setIsComposing(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 1rem',
                  backgroundColor: '#FAF7F2',
                  borderRadius: '6px',
                  border: '1px solid #E6DFD5',
                  cursor: 'pointer',
                  color: '#787774',
                  fontSize: '0.875rem',
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '4px',
                    backgroundColor: '#12544F',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {user ? user.username.charAt(0).toUpperCase() : '+'}
                </div>
                <span>Khởi tạo một chủ đề thảo luận kỹ nghệ hoặc đặt câu hỏi...</span>
              </div>
            ) : (
              <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E2328' }}>Tạo Thảo Luận Mới</span>
                  <select
                    value={postSpace}
                    onChange={(e) => setPostSpace(e.target.value)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '4px',
                      border: '1px solid #E6DFD5',
                      backgroundColor: '#FAF7F2',
                      fontSize: '0.8rem',
                      color: '#4A4A4A',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <option value="s/devops-infra">s/devops-infra</option>
                    <option value="s/docker-k8s">s/docker-k8s</option>
                    <option value="s/system-design">s/system-design</option>
                    <option value="s/security-auth">s/security-auth</option>
                    <option value="s/ci-cd">s/ci-cd</option>
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Tiêu đề thảo luận (ngắn gọn, trực diện, chuyên sâu)..."
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  style={{
                    padding: '0.6rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #E6DFD5',
                    fontSize: '0.9rem',
                    color: '#1E2328',
                    outline: 'none',
                  }}
                  autoFocus
                />

                <textarea
                  placeholder="Mô tả bối cảnh kỹ thuật, bài toán gặp phải, giải pháp kiến trúc đề xuất..."
                  rows={4}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #E6DFD5',
                    fontSize: '0.85rem',
                    color: '#4A4A4A',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: 1.5,
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsComposing(false)}
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: '6px',
                      backgroundColor: 'transparent',
                      border: '1px solid #E6DFD5',
                      color: '#787774',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.45rem 1.25rem',
                      borderRadius: '6px',
                      backgroundColor: '#12544F',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}
                  >
                    Đăng Thảo Luận
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* FEED FILTER TABS */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #E6DFD5',
              paddingBottom: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['top', 'latest', 'hot'] as const).map((tab) => {
                const labels = {
                  top: 'Bình chọn cao',
                  latest: 'Mới nhất',
                  hot: 'Sôi nổi',
                };
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: isActive ? '#12544F' : 'transparent',
                      color: isActive ? '#FFFFFF' : '#787774',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: '0.78rem', color: '#787774' }}>
              Hiển thị <strong style={{ color: '#1E2328' }}>{filteredPosts.length}</strong> bài viết
            </div>
          </div>

          {/* POSTS LIST (SOCIAL CARDS) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredPosts.map((post) => (
              <article
                key={post.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E6DFD5',
                  padding: '1.25rem',
                  display: 'grid',
                  gridTemplateColumns: '48px 1fr',
                  gap: '1rem',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                {/* VOTE RAIL */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <button
                    onClick={() => handleVote(post.id, 'up')}
                    aria-label="Upvote"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: post.userVote === 'up' ? '#12544F' : '#E6DFD5',
                      backgroundColor: post.userVote === 'up' ? '#EAF2F1' : '#FAF7F2',
                      color: post.userVote === 'up' ? '#12544F' : '#787774',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>

                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: post.userVote === 'up' ? '#12544F' : post.userVote === 'down' ? '#9F2F2D' : '#1E2328',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {post.votes}
                  </span>

                  <button
                    onClick={() => handleVote(post.id, 'down')}
                    aria-label="Downvote"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: post.userVote === 'down' ? '#9F2F2D' : '#E6DFD5',
                      backgroundColor: post.userVote === 'down' ? '#FDEBEC' : '#FAF7F2',
                      color: post.userVote === 'down' ? '#9F2F2D' : '#787774',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>

                {/* POST CONTENT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {/* POST META HEADER */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '0.15rem 0.55rem',
                        borderRadius: '4px',
                        backgroundColor: '#EAF2F1',
                        color: '#12544F',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {post.space.name}
                    </span>

                    <span style={{ fontSize: '0.78rem', color: '#787774' }}>• Đăng bởi</span>

                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E2328' }}>
                      @{post.author.username}
                    </span>

                    {post.author.badge && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '0.05rem 0.4rem',
                          borderRadius: '4px',
                          backgroundColor: '#FDF6E2',
                          color: '#8C6514',
                          fontWeight: 600,
                        }}
                      >
                        {post.author.badge}
                      </span>
                    )}

                    <span style={{ fontSize: '0.75rem', color: '#9EA3A8' }}>{post.createdAt}</span>
                  </div>

                  {/* POST TITLE */}
                  <h2
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: '#1E2328',
                      margin: 0,
                      lineHeight: 1.35,
                      letterSpacing: '-0.015em',
                    }}
                  >
                    {post.title}
                  </h2>

                  {/* POST SUMMARY */}
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: '#4A4A4A',
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {post.summary}
                  </p>

                  {/* CODE SNIPPET (IF ANY) */}
                  {post.codeSnippet && (
                    <div
                      style={{
                        backgroundColor: '#1E2328',
                        color: '#E6DFD5',
                        borderRadius: '6px',
                        padding: '0.85rem 1rem',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.78rem',
                        lineHeight: 1.5,
                        overflowX: 'auto',
                        border: '1px solid #12181F',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.68rem',
                          color: '#9EA3A8',
                          textTransform: 'uppercase',
                          marginBottom: '0.4rem',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {post.codeSnippet.language}
                      </div>
                      <pre style={{ margin: 0 }}>
                        <code>{post.codeSnippet.code}</code>
                      </pre>
                    </div>
                  )}

                  {/* TAGS */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: '#FAF7F2',
                          border: '1px solid #E6DFD5',
                          color: '#4A4A4A',
                          fontSize: '0.72rem',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* POST FOOTER ACTIONS */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.25rem',
                      paddingTop: '0.65rem',
                      borderTop: '1px solid #F0EAE1',
                      marginTop: '0.35rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.8rem',
                        color: '#787774',
                        cursor: 'pointer',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>{post.commentsCount} Thảo luận</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.8rem',
                        color: '#787774',
                        cursor: 'pointer',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>Lưu lại</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.8rem',
                        color: '#787774',
                        cursor: 'pointer',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                      <span>Chia sẻ</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </main>

        {/* ========================================================================= */}
        {/* RIGHT RAIL: COMMUNITY WIDGETS & LEADERBOARD */}
        {/* ========================================================================= */}
        <aside
          style={{
            position: 'sticky',
            top: '72px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* ABOUT COMMUNITY WIDGET */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E6DFD5',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#1E4620',
                }}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#12544F', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Cộng Đồng Kỹ Nghệ ACAD
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#4A4A4A', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Không gian thảo luận chuyên sâu về kiến trúc hệ thống phân tán, DevOps thực chiến, multi-cloud và bảo mật doanh nghiệp.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                padding: '0.75rem',
                backgroundColor: '#FAF7F2',
                borderRadius: '6px',
                border: '1px solid #E6DFD5',
                textAlign: 'center',
                marginBottom: '1rem',
              }}
            >
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#12544F', fontFamily: 'var(--font-mono)' }}>2,450</div>
                <div style={{ fontSize: '0.7rem', color: '#787774' }}>Kỹ sư thành viên</div>
              </div>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#12544F', fontFamily: 'var(--font-mono)' }}>184</div>
                <div style={{ fontSize: '0.7rem', color: '#787774' }}>Trực tuyến</div>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#787774', lineHeight: 1.4 }}>
              Cơ chế xếp hạng tín nhiệm bằng điểm <strong>Karma</strong> thực chất thông qua bình chọn giải pháp giá trị.
            </div>
          </div>

          {/* KARMA LEADERBOARD */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E6DFD5',
              padding: '1.25rem',
            }}
          >
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#787774',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Top Đóng Góp Tuần</span>
              <span style={{ fontSize: '0.68rem', color: '#12544F' }}>Tuần 39</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {TOP_CONTRIBUTORS.map((c, index) => (
                <div
                  key={c.username}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: index === 0 ? '#FAF7F2' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span
                      style={{
                        width: '18px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: index === 0 ? '#12544F' : '#787774',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      #{index + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E2328' }}>{c.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#787774', fontFamily: 'var(--font-mono)' }}>@{c.username}</div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#12544F',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    +{c.karma}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ENGINEERING GUIDELINES */}
          <div
            style={{
              backgroundColor: '#FAF7F2',
              borderRadius: '8px',
              border: '1px solid #E6DFD5',
              padding: '1rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1E2328', marginBottom: '0.5rem' }}>
              Quy Chuẩn Thảo Luận Văn Minh
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.74rem', color: '#787774', lineHeight: 1.6 }}>
              <li>Giải pháp kèm dẫn chứng kiến trúc hoặc benchmark đo lường.</li>
              <li>Tôn trọng đồng nghiệp, bảo vệ thông tin nội bộ doanh nghiệp.</li>
              <li>Tuân thủ nguyên tắc mã hóa an toàn và bảo mật dữ liệu.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
