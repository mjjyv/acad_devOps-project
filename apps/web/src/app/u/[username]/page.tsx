'use client';

import type { PublicUserProfile } from '@acad/contracts';
import { useParams } from 'next/navigation';
import type React from 'react';
import { useEffect, useState } from 'react';
import { SessionsModal } from '@/components/auth/sessions-modal';
import { FloatingChatWidget } from '@/components/chat/floating-chat-widget';
import { PostCard, type PostItem } from '@/components/feed/post-card';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { ChatBubbleIcon, FireIcon, ShieldIcon } from '@/components/ui/icons';
import { ChatApi } from '@/lib/api/chat';
import { CommunityApi } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';
import { mapThreadSummaryToPostItem } from '@/lib/utils/thread-mapper';

export default function UserProfilePage() {
  const params = useParams();
  const username = typeof params?.username === 'string' ? params.username : '';
  const { user: currentUser, isAuthenticated, requireAuth } = useAuth();
  const { showToast, setChatWidgetState } = useUI();

  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'saved'>('overview');
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);

  const [publicProfile, setPublicProfile] = useState<PublicUserProfile | null>(null);
  const [profileNotFound, setProfileNotFound] = useState(false);
  const [userPosts, setUserPosts] = useState<PostItem[]>([]);
  const [savedPosts, setSavedPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isChatComposeOpen, setIsChatComposeOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [sendingChatReq, setSendingChatReq] = useState(false);

  const isOwnProfile = Boolean(
    currentUser && currentUser.username.toLowerCase() === username.toLowerCase(),
  );

  const effectiveRole = isOwnProfile ? currentUser?.role || 'USER' : publicProfile?.role || 'USER';
  const effectiveKarma = isOwnProfile
    ? (currentUser?.karmaScore ?? 0)
    : (publicProfile?.karmaScore ?? 0);
  const effectiveBio = isOwnProfile
    ? currentUser?.bio || 'Thành viên cộng đồng kỹ thuật trên nền tảng SYNAPSE Platform.'
    : publicProfile?.bio || 'Thành viên cộng đồng kỹ thuật trên nền tảng SYNAPSE Platform.';
  const effectiveCreatedAt = isOwnProfile ? currentUser?.createdAt : publicProfile?.createdAt;
  const joinedDate = effectiveCreatedAt
    ? new Date(effectiveCreatedAt).toLocaleDateString('vi-VN', {
        month: 'long',
        year: 'numeric',
      })
    : 'Thành viên SYNAPSE';

  useEffect(() => {
    void isAuthenticated;
    let isMounted = true;
    async function loadUserActivity() {
      if (!username) return;
      try {
        setLoading(true);
        setProfileNotFound(false);

        const [fetchedProfile, popularRes, homeRes, savedList, spacesList] = await Promise.all([
          CommunityApi.getPublicUserProfile(username).catch(() => null),
          CommunityApi.getPopularFeed({ sort: 'new', limit: 50 }).catch(() => ({
            items: [],
            nextCursor: null,
            hasMore: false,
          })),
          isOwnProfile
            ? CommunityApi.getHomeFeed({ sort: 'new', limit: 50 }).catch(() => ({
                items: [],
                nextCursor: null,
                hasMore: false,
              }))
            : Promise.resolve({ items: [], nextCursor: null, hasMore: false }),
          isOwnProfile ? CommunityApi.getSavedThreads(30, 0).catch(() => []) : Promise.resolve([]),
          isAuthenticated ? CommunityApi.getSpaces(50, 0).catch(() => []) : Promise.resolve([]),
        ]);

        if (!isMounted) return;

        if (!fetchedProfile && !isOwnProfile) {
          setProfileNotFound(true);
        }
        setPublicProfile(fetchedProfile);

        const joinedSlugs = new Set(spacesList.filter((s) => s.isJoined).map((s) => s.slug));
        const mergedById = new Map<string, (typeof popularRes.items)[number]>();
        for (const t of [...popularRes.items, ...homeRes.items]) {
          if (t.authorUsername.toLowerCase() === username.toLowerCase()) {
            mergedById.set(t.id, t);
          }
        }

        const authored = Array.from(mergedById.values()).map((t) =>
          mapThreadSummaryToPostItem(t, { joinedSlugs }),
        );
        const saved = savedList.map((t) => mapThreadSummaryToPostItem(t, { joinedSlugs }));

        setUserPosts(authored);
        setSavedPosts(saved);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void loadUserActivity();
    return () => {
      isMounted = false;
    };
  }, [username, isOwnProfile, isAuthenticated]);

  const handleStartDirectChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicProfile || !chatDraft.trim() || sendingChatReq) return;
    requireAuth(async () => {
      try {
        setSendingChatReq(true);
        const res = await ChatApi.initiateDirectChat(publicProfile.id, chatDraft.trim());
        setChatDraft('');
        setIsChatComposeOpen(false);
        setChatWidgetState('docked');
        showToast(
          res.isRequest
            ? `Đã gửi yêu cầu trò chuyện tới u/${publicProfile.username}`
            : `Đã mở kênh trò chuyện với u/${publicProfile.username}`,
        );
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Không thể bắt đầu trò chuyện');
      } finally {
        setSendingChatReq(false);
      }
    }, `Đăng nhập để nhắn tin với u/${username}`);
  };

  const displayedPosts = activeTab === 'saved' ? savedPosts : userPosts;

  return (
    <div className="app-shell">
      <Header />

      <div className="app-container" style={{ maxWidth: '1080px' }}>
        <main style={{ flex: 1, minWidth: 0 }}>
          {profileNotFound ? (
            <div className="reddit-card" style={{ padding: '40px', textAlign: 'center' }}>
              <h2
                style={{ fontSize: '18px', fontWeight: 800, color: '#f43f5e', marginBottom: '8px' }}
              >
                Không tìm thấy người dùng u/{username}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Tài khoản này không tồn tại hoặc đã bị vô hiệu hóa.
              </p>
            </div>
          ) : (
            <>
              <div
                className="reddit-card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    height: '110px',
                    background: 'linear-gradient(135deg, #30364F 0%, #444C6E 50%, #ACBAC4 130%)',
                  }}
                />

                <div style={{ padding: '0 20px 20px 20px', position: 'relative' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      marginTop: '-36px',
                      marginBottom: '14px',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: '#30364F',
                        border: '4px solid var(--bg-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        fontWeight: 800,
                        color: '#F0F0DB',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                      }}
                    >
                      {username.charAt(0).toUpperCase()}
                    </div>

                    {isOwnProfile ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setIsSessionsOpen(true)}
                          className="reddit-pill-btn"
                        >
                          <ShieldIcon size={14} /> Quản lý Phiên (Sessions)
                        </button>
                      </div>
                    ) : publicProfile ? (
                      <button
                        type="button"
                        onClick={() =>
                          requireAuth(
                            () => setIsChatComposeOpen((prev) => !prev),
                            `Đăng nhập để nhắn tin với u/${username}`,
                          )
                        }
                        className="reddit-pill-btn primary"
                      >
                        <ChatBubbleIcon size={14} /> Nhắn tin trực tiếp
                      </button>
                    ) : null}
                  </div>

                  {isChatComposeOpen && publicProfile && (
                    <form
                      onSubmit={handleStartDirectChat}
                      style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '14px',
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <input
                        type="text"
                        required
                        placeholder={`Gửi lời chào tới u/${publicProfile.username}...`}
                        value={chatDraft}
                        onChange={(e) => setChatDraft(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-full)',
                          border: '1px solid var(--border-subtle)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                        }}
                      />
                      <button
                        type="submit"
                        disabled={sendingChatReq || !chatDraft.trim()}
                        className="reddit-pill-btn primary"
                      >
                        {sendingChatReq ? 'Đang gửi...' : 'Gửi'}
                      </button>
                    </form>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '6px',
                    }}
                  >
                    <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      u/{username}
                    </h1>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor:
                          effectiveRole === 'ADMIN' ? 'var(--color-danger)' : 'var(--bg-badge)',
                        color: '#ffffff',
                      }}
                    >
                      {effectiveRole}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      marginBottom: '12px',
                    }}
                  >
                    {effectiveBio}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    padding: '0 16px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  {(isOwnProfile
                    ? (['overview', 'posts', 'saved'] as const)
                    : (['overview', 'posts'] as const)
                  ).map((tab) => {
                    const isActive = activeTab === tab;
                    const label =
                      tab === 'overview'
                        ? 'Tổng quan'
                        : tab === 'posts'
                          ? 'Bài viết'
                          : `Đã lưu (${savedPosts.length})`;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '12px 14px',
                          fontSize: '13px',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                          position: 'relative',
                        }}
                      >
                        {label}
                        {isActive && (
                          <span
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 14,
                              right: 14,
                              height: '3px',
                              backgroundColor: 'var(--color-brand)',
                              borderRadius: '2px',
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {loading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Đang tải dữ liệu hoạt động của u/{username}...
                </div>
              ) : displayedPosts.length === 0 ? (
                <div
                  className="reddit-card"
                  style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}
                >
                  {activeTab === 'saved'
                    ? 'Bạn chưa lưu bài viết nào.'
                    : `Chưa có bài viết nào của u/${username}.`}
                </div>
              ) : (
                <div>
                  {displayedPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        <aside
          style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}
          className="app-right-rail"
        >
          <div className="reddit-card">
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '14px',
              }}
            >
              Thống Kê Hoạt Động
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  backgroundColor: 'var(--bg-input)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: 'var(--color-brand)',
                    marginBottom: '2px',
                  }}
                >
                  <FireIcon size={16} />
                  <span style={{ fontSize: '16px', fontWeight: 800 }}>{effectiveKarma}</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tổng Karma</span>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-input)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    display: 'block',
                    marginBottom: '2px',
                  }}
                >
                  {isOwnProfile
                    ? (currentUser?.threadsCount ?? userPosts.length)
                    : (publicProfile?.threadsCount ?? userPosts.length)}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bài Thảo Luận</span>
              </div>
            </div>

            <div
              style={{
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '12px',
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              <span>
                🗓️ Gia nhập: <strong>{joinedDate}</strong>
              </span>
            </div>
          </div>
        </aside>
      </div>

      <BottomNav />
      <FloatingChatWidget />

      <SessionsModal isOpen={isSessionsOpen} onClose={() => setIsSessionsOpen(false)} />
    </div>
  );
}
