'use client';

import type { ModReport, PublicUserProfile, ThreadSummary } from '@acad/contracts';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NewChatModal } from '@/components/chat/new-chat-modal';
import { PostCard } from '@/components/feed/post-card';
import { AppShell } from '@/components/layout/app-shell';
import { ChatBubbleIcon, FlagIcon, ShieldIcon } from '@/components/ui/icons';
import { fetchPublicUserProfile } from '@/lib/api/client';
import { CommunityApi } from '@/lib/api/community';
import { ModerationApi } from '@/lib/api/moderation';
import { useAuth } from '@/lib/auth/auth-context';

export default function PublicUserProfilePage() {
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(params.username ?? '');
  const { user: currentUser, openAuthModal } = useAuth();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'saved' | 'reports'>('overview');
  const [savedThreads, setSavedThreads] = useState<ThreadSummary[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [myReports, setMyReports] = useState<ModReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [directChatOpen, setDirectChatOpen] = useState(false);

  useEffect(() => {
    if (!username) return;
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const data = await fetchPublicUserProfile(username);
        if (active) setProfile(data);
      } catch (err) {
        if (active) {
          setErrorMsg(err instanceof Error ? err.message : 'Không tìm thấy hồ sơ người dùng');
          setProfile(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [username]);

  const isOwnProfile = Boolean(currentUser && profile && currentUser.username === profile.username);

  useEffect(() => {
    if (!isOwnProfile || activeTab !== 'saved') return;
    let active = true;
    async function loadSaved() {
      try {
        setLoadingSaved(true);
        const items = await CommunityApi.getSavedThreads();
        if (active) setSavedThreads(items);
      } catch {
        if (active) setSavedThreads([]);
      } finally {
        if (active) setLoadingSaved(false);
      }
    }
    void loadSaved();
    return () => {
      active = false;
    };
  }, [isOwnProfile, activeTab]);

  useEffect(() => {
    if (!isOwnProfile || activeTab !== 'reports') return;
    let active = true;
    async function loadReports() {
      try {
        setLoadingReports(true);
        const items = await ModerationApi.getMyReports();
        if (active) setMyReports(Array.isArray(items) ? items : []);
      } catch {
        if (active) setMyReports([]);
      } finally {
        if (active) setLoadingReports(false);
      }
    }
    void loadReports();
    return () => {
      active = false;
    };
  }, [isOwnProfile, activeTab]);

  return (
    <AppShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading && (
          <div className="surface-card" style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>
            Đang tải hồ sơ u/{username}...
          </div>
        )}

        {!loading && errorMsg && (
          <section
            className="surface-card"
            role="alert"
            style={{
              padding: '28px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Không tìm thấy u/{username}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{errorMsg}</p>
            <Link href="/" className="btn-primary" style={{ textDecoration: 'none' }}>
              Quay về trang chủ
            </Link>
          </section>
        )}

        {!loading && profile && (
          <section
            className="surface-card"
            data-testid="public-profile-card"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-brand)',
                    color: 'var(--text-inverse)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {profile.username.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
                  >
                    <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      u/{profile.username}
                    </h1>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--bg-badge)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--color-brand)',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <ShieldIcon size={12} />
                      <span>{profile.role}</span>
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--bg-pill)',
                        color: 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {profile.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Tham gia từ {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {isOwnProfile ? (
                <Link
                  href="/settings/sessions"
                  className="btn-ghost"
                  style={{ textDecoration: 'none', fontSize: '13px' }}
                >
                  Quản lý phiên thiết bị
                </Link>
              ) : (
                <button
                  type="button"
                  data-testid="profile-direct-message-btn"
                  onClick={() => {
                    if (!currentUser) {
                      openAuthModal('login');
                    } else {
                      setDirectChatOpen(true);
                    }
                  }}
                  className="btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  <ChatBubbleIcon size={15} />
                  <span>Nhắn tin trực tiếp</span>
                </button>
              )}
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {profile.bio || 'Thành viên chưa cập nhật giới thiệu bản thân.'}
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                borderTop: '1px solid var(--border-divider)',
                paddingTop: '14px',
              }}
            >
              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Karma Score</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-brand)' }}>
                  {profile.karmaScore}
                </div>
              </div>

              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Bài viết đã đăng
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {profile.threadsCount}
                </div>
              </div>
            </div>
          </section>
        )}

        {!loading && profile && isOwnProfile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}
                onClick={() => setActiveTab('overview')}
                style={{ fontSize: '13px', padding: '6px 14px' }}
              >
                Tổng quan
              </button>
              <button
                type="button"
                className={activeTab === 'saved' ? 'btn-primary' : 'btn-ghost'}
                onClick={() => setActiveTab('saved')}
                style={{ fontSize: '13px', padding: '6px 14px' }}
              >
                Bài viết đã lưu
              </button>
              <button
                type="button"
                data-testid="tab-my-reports"
                className={activeTab === 'reports' ? 'btn-primary' : 'btn-ghost'}
                onClick={() => setActiveTab('reports')}
                style={{ fontSize: '13px', padding: '6px 14px' }}
              >
                <FlagIcon size={13} />
                <span>Báo cáo đã gửi</span>
              </button>
            </div>

            {activeTab === 'saved' && (
              <div
                data-testid="saved-threads-list"
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                {loadingSaved ? (
                  <div
                    className="surface-card"
                    style={{ color: 'var(--text-muted)', fontSize: '13px' }}
                  >
                    Đang tải danh sách bài viết đã lưu...
                  </div>
                ) : savedThreads.length === 0 ? (
                  <div
                    className="surface-card"
                    style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}
                  >
                    Bạn chưa lưu bài viết nào.
                  </div>
                ) : (
                  savedThreads.map((thread) => <PostCard key={thread.id} thread={thread} />)
                )}
              </div>
            )}

            {activeTab === 'reports' && (
              <div
                data-testid="my-reports-list"
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                {loadingReports ? (
                  <div
                    className="surface-card"
                    style={{ color: 'var(--text-muted)', fontSize: '13px' }}
                  >
                    Đang tải danh sách báo cáo đã gửi...
                  </div>
                ) : myReports.length === 0 ? (
                  <div
                    className="surface-card"
                    style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}
                  >
                    Bạn chưa gửi báo cáo vi phạm nào.
                  </div>
                ) : (
                  myReports.map((report) => {
                    const badgeColor =
                      report.status === 'RESOLVED'
                        ? 'var(--color-success)'
                        : report.status === 'DISMISSED'
                          ? 'var(--text-muted)'
                          : 'var(--color-warning)';
                    return (
                      <article
                        key={report.id}
                        data-testid={`my-report-item-${report.id}`}
                        className="surface-card"
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '999px',
                                backgroundColor: 'var(--bg-subtle)',
                                color: badgeColor,
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              {report.status}
                            </span>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {report.targetType}
                            </span>
                          </div>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            {new Date(report.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                          {report.reason}
                        </p>
                        {report.targetType === 'THREAD' && (
                          <Link
                            href={`/threads/${report.targetId}`}
                            style={{
                              fontSize: '12px',
                              color: 'var(--color-brand)',
                              textDecoration: 'none',
                            }}
                          >
                            Xem bài viết liên quan →
                          </Link>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {directChatOpen && profile && (
        <NewChatModal
          open={directChatOpen}
          onClose={() => setDirectChatOpen(false)}
          defaultRecipientUsername={profile.username}
        />
      )}
    </AppShell>
  );
}
