'use client';

import type {
  AdminStats,
  AdminUserListItem,
  AuditLog,
  ModReport,
  ModReportStatus,
  UserRole,
  UserStatus,
} from '@acad/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FloatingChatWidget } from '@/components/chat/floating-chat-widget';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { ShieldIcon } from '@/components/ui/icons';
import { type AdminSpaceItem, type AdminThreadItem, ModerationApi } from '@/lib/api/moderation';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';

type AdminTab = 'reports' | 'users' | 'spaces' | 'threads' | 'audit';

export default function AdminDashboardPage() {
  const { user, isLoading: authLoading, openAuthModal } = useAuth();
  const { showToast } = useUI();

  const [activeTab, setActiveTab] = useState<AdminTab>('reports');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reports state
  const [reportFilter, setReportFilter] = useState<ModReportStatus | 'ALL'>('PENDING');
  const [reports, setReports] = useState<ModReport[]>([]);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  // Users state
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<AdminUserListItem[]>([]);

  // Spaces & Threads state
  const [spaces, setSpaces] = useState<AdminSpaceItem[]>([]);
  const [threadSearch, setThreadSearch] = useState('');
  const [threads, setThreads] = useState<AdminThreadItem[]>([]);

  // Audit logs state
  const [actionFilter, setActionFilter] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'GLOBAL_MOD';

  const loadStats = useCallback(async () => {
    const s = await ModerationApi.getStats();
    setStats(s);
  }, []);

  const loadActiveTabData = useCallback(async () => {
    if (!isPrivileged) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await loadStats();
      if (activeTab === 'reports') {
        const res = await ModerationApi.listReports({
          status: reportFilter === 'ALL' ? undefined : reportFilter,
          limit: 50,
        });
        setReports(res.reports);
      } else if (activeTab === 'users') {
        const res = await ModerationApi.listUsers({
          search: userSearch.trim() || undefined,
          limit: 50,
        });
        setUsers(res.users);
      } else if (activeTab === 'spaces') {
        const list = await ModerationApi.listSpaces();
        setSpaces(list);
      } else if (activeTab === 'threads') {
        const res = await ModerationApi.listThreads({
          search: threadSearch.trim() || undefined,
          limit: 50,
        });
        setThreads(res.threads);
      } else if (activeTab === 'audit') {
        const res = await ModerationApi.listAuditLogs({
          action: actionFilter.trim() || undefined,
          limit: 50,
        });
        setAuditLogs(res.logs);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi tải dữ liệu Admin Console');
    } finally {
      setLoading(false);
    }
  }, [isPrivileged, activeTab, reportFilter, userSearch, threadSearch, actionFilter, loadStats]);

  useEffect(() => {
    if (!authLoading && isPrivileged) {
      void loadActiveTabData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, isPrivileged, loadActiveTabData]);

  const handleResolveReport = async (reportId: string, status: 'RESOLVED' | 'DISMISSED') => {
    try {
      await ModerationApi.resolveReport(reportId, {
        status,
        note: resolutionNotes[reportId]?.trim() || undefined,
      });
      showToast(`Đã xử lý báo cáo: ${status}`);
      await loadActiveTabData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể xử lý báo cáo');
    }
  };

  const handleChangeRole = async (
    targetUserId: string,
    role: 'USER' | 'SPACE_MOD' | 'GLOBAL_MOD' | 'ADMIN',
  ) => {
    try {
      await ModerationApi.updateUserRole(targetUserId, role);
      showToast(`Đã cập nhật vai trò thành ${role}`);
      await loadActiveTabData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể cập nhật vai trò');
    }
  };

  const handleChangeStatus = async (
    targetUserId: string,
    status: 'ACTIVE' | 'SUSPENDED' | 'SHADOWBANNED',
  ) => {
    try {
      await ModerationApi.updateUserStatus(targetUserId, status, `Admin action -> ${status}`);
      showToast(`Đã cập nhật trạng thái người dùng: ${status}`);
      await loadActiveTabData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể đổi trạng thái');
    }
  };

  const handleRevokeSessions = async (targetUserId: string) => {
    try {
      await ModerationApi.revokeUserSessions(targetUserId);
      showToast('Đã thu hồi toàn bộ phiên đăng nhập của người dùng');
      await loadActiveTabData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể thu hồi phiên');
    }
  };

  const handleTogglePin = async (thread: AdminThreadItem) => {
    try {
      await ModerationApi.setThreadPinned(thread.id, !thread.isPinned);
      showToast(!thread.isPinned ? 'Đã ghim bài viết' : 'Đã bỏ ghim bài viết');
      await loadActiveTabData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi cập nhật ghim');
    }
  };

  const handleToggleLock = async (thread: AdminThreadItem) => {
    try {
      await ModerationApi.setThreadLocked(thread.id, !thread.isLocked);
      showToast(!thread.isLocked ? 'Đã khóa bình luận bài viết' : 'Đã mở khóa bài viết');
      await loadActiveTabData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi cập nhật khóa');
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      await ModerationApi.deleteThread(threadId, 'Removed by Moderator via Admin Hub');
      showToast('Đã xóa bài viết');
      await loadActiveTabData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể xóa bài viết');
    }
  };

  const handleDeleteSpace = async (spaceId: string, slug: string) => {
    if (!confirm(`Xác nhận xóa vĩnh viễn Không gian s/${slug}?`)) return;
    try {
      await ModerationApi.deleteSpace(spaceId, `Deleted s/${slug} via Admin Hub`);
      showToast(`Đã xóa s/${slug}`);
      await loadActiveTabData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể xóa không gian');
    }
  };

  return (
    <div className="app-shell">
      <Header />

      <div className="app-container">
        <LeftSidebar />

        <main className="main-content" style={{ maxWidth: '1080px', width: '100%' }}>
          {authLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Đang xác thực quyền Quản trị viên...
            </div>
          ) : !user ? (
            <div className="reddit-card" style={{ padding: '36px', textAlign: 'center' }}>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                }}
              >
                Yêu cầu đăng nhập Quản trị viên
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Khu vực Moderation & Admin Hub chỉ dành cho tài khoản ADMIN hoặc GLOBAL_MOD.
              </p>
              <button
                type="button"
                className="reddit-pill-btn primary"
                onClick={() => openAuthModal('login')}
              >
                Đăng nhập
              </button>
            </div>
          ) : !isPrivileged ? (
            <div className="reddit-card" style={{ padding: '36px', textAlign: 'center' }}>
              <h2
                style={{ fontSize: '18px', fontWeight: 800, color: '#f43f5e', marginBottom: '8px' }}
              >
                403 Forbidden — Không đủ quyền truy cập
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Tài khoản u/{user.username} ({user.role}) không có quyền truy cập Admin Control Hub.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Title Header */}
              <div
                className="reddit-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#1b2920',
                      border: '1px solid #285432',
                      color: '#46d160',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShieldIcon size={20} />
                  </div>
                  <div>
                    <h1 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Moderation & Admin Control Hub
                    </h1>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Quản trị tập trung PostgreSQL 16 + Redis Sessions + Audit Logs bất biến
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void loadActiveTabData()}
                  className="reddit-pill-btn"
                >
                  Làm mới dữ liệu
                </button>
              </div>

              {/* KPI Strip */}
              {stats && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {[
                    {
                      label: 'Active Users',
                      value: stats.activeUsersCount,
                      accent: 'var(--color-brand)',
                    },
                    {
                      label: 'Redis Sessions',
                      value: stats.activeSessionsCount,
                      accent: '#46d160',
                    },
                    { label: 'Spaces', value: stats.spacesCount, accent: 'var(--text-primary)' },
                    { label: 'Threads', value: stats.threadsCount, accent: 'var(--text-primary)' },
                    {
                      label: 'Comments',
                      value: stats.commentsCount,
                      accent: 'var(--text-primary)',
                    },
                    {
                      label: 'Pending Reports',
                      value: stats.pendingReportsCount,
                      accent: stats.pendingReportsCount > 0 ? '#f43f5e' : '#46d160',
                    },
                  ].map((kpi) => (
                    <div key={kpi.label} className="reddit-card" style={{ padding: '14px' }}>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: kpi.accent }}>
                        {kpi.value}
                      </div>
                      <div
                        style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}
                      >
                        {kpi.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Navigation Tabs */}
              <div
                className="reddit-card"
                style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '10px 14px' }}
              >
                {(
                  [
                    { id: 'reports', label: `Mod Queue (${stats?.pendingReportsCount ?? 0})` },
                    { id: 'users', label: 'Người dùng & RBAC' },
                    { id: 'spaces', label: 'Không gian (Spaces)' },
                    { id: 'threads', label: 'Bài viết (Threads)' },
                    { id: 'audit', label: 'Audit Logs' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`reddit-pill-btn ${activeTab === tab.id ? 'primary' : ''}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {errorMsg && (
                <div
                  className="reddit-card"
                  style={{ color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                >
                  {errorMsg}
                </div>
              )}

              {loading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Đang tải dữ liệu...
                </div>
              ) : activeTab === 'reports' ? (
                <div
                  className="reddit-card"
                  style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
                >
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(['PENDING', 'RESOLVED', 'DISMISSED', 'ALL'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setReportFilter(st)}
                        className={`reddit-pill-btn ${reportFilter === st ? 'primary' : ''}`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  {reports.length === 0 ? (
                    <div
                      style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0' }}
                    >
                      Không có báo cáo nào trong trạng thái {reportFilter}.
                    </div>
                  ) : (
                    reports.map((rep) => (
                      <div
                        key={rep.id}
                        style={{
                          padding: '14px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: 'var(--color-brand)',
                            }}
                          >
                            [{rep.targetType}] {rep.targetId}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: 'var(--text-muted)',
                            }}
                          >
                            {rep.status} • bởi u/{rep.reporterUsername}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                          Lý do: {rep.reason}
                        </div>
                        {rep.status === 'PENDING' && (
                          <div
                            style={{
                              display: 'flex',
                              gap: '8px',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              marginTop: '4px',
                            }}
                          >
                            <input
                              type="text"
                              placeholder="Ghi chú xử lý (tùy chọn)..."
                              value={resolutionNotes[rep.id] || ''}
                              onChange={(e) =>
                                setResolutionNotes((prev) => ({
                                  ...prev,
                                  [rep.id]: e.target.value,
                                }))
                              }
                              style={{
                                flex: 1,
                                minWidth: '180px',
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-subtle)',
                                backgroundColor: 'var(--bg-surface)',
                                color: 'var(--text-primary)',
                                fontSize: '12px',
                              }}
                            />
                            <button
                              type="button"
                              className="reddit-pill-btn primary"
                              onClick={() => void handleResolveReport(rep.id, 'RESOLVED')}
                            >
                              Resolve
                            </button>
                            <button
                              type="button"
                              className="reddit-pill-btn"
                              onClick={() => void handleResolveReport(rep.id, 'DISMISSED')}
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : activeTab === 'users' ? (
                <div
                  className="reddit-card"
                  style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo username hoặc email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    style={{
                      maxWidth: '340px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {users.map((u) => (
                      <div
                        key={u.id}
                        style={{
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '14px',
                              color: 'var(--text-primary)',
                            }}
                          >
                            u/{u.username}{' '}
                            <span
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                fontWeight: 500,
                              }}
                            >
                              ({u.email})
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              marginTop: '2px',
                            }}
                          >
                            Role: <strong>{u.role}</strong> • Status: <strong>{u.status}</strong> •
                            Karma: {u.karmaScore} • Sessions: {u.sessionsCount}
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            gap: '6px',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                          }}
                        >
                          <select
                            aria-label={`Role for ${u.username}`}
                            value={u.role}
                            disabled={user.role !== 'ADMIN'}
                            onChange={(e) =>
                              void handleChangeRole(
                                u.id,
                                e.target.value as Exclude<UserRole, 'GUEST'>,
                              )
                            }
                            style={{
                              padding: '5px 8px',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-subtle)',
                              fontSize: '12px',
                            }}
                          >
                            <option value="USER">USER</option>
                            <option value="SPACE_MOD">SPACE_MOD</option>
                            <option value="GLOBAL_MOD">GLOBAL_MOD</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>

                          <select
                            aria-label={`Status for ${u.username}`}
                            value={u.status}
                            onChange={(e) =>
                              void handleChangeStatus(
                                u.id,
                                e.target.value as Exclude<UserStatus, 'DELETED'>,
                              )
                            }
                            style={{
                              padding: '5px 8px',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-subtle)',
                              fontSize: '12px',
                            }}
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="SHADOWBANNED">SHADOWBANNED</option>
                            <option value="SUSPENDED">SUSPENDED</option>
                          </select>

                          <button
                            type="button"
                            className="reddit-pill-btn"
                            onClick={() => void handleRevokeSessions(u.id)}
                          >
                            Revoke Sessions
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeTab === 'spaces' ? (
                <div
                  className="reddit-card"
                  style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                >
                  {spaces.map((sp) => (
                    <div
                      key={sp.id}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <Link
                          href={`/s/${sp.slug}`}
                          style={{
                            fontWeight: 700,
                            fontSize: '14px',
                            color: 'var(--color-brand)',
                            textDecoration: 'none',
                          }}
                        >
                          s/{sp.slug} — {sp.name}
                        </Link>
                        <div
                          style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}
                        >
                          {sp.isPrivate ? 'Private' : 'Public'} • {sp.memberCount} thành viên •{' '}
                          {sp.threadCount} bài viết
                        </div>
                      </div>

                      {user.role === 'ADMIN' && (
                        <button
                          type="button"
                          className="reddit-pill-btn"
                          style={{ color: '#f43f5e' }}
                          onClick={() => void handleDeleteSpace(sp.id, sp.slug)}
                        >
                          Xóa Space
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : activeTab === 'threads' ? (
                <div
                  className="reddit-card"
                  style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                  <input
                    type="text"
                    placeholder="Tìm kiếm bài viết theo tiêu đề hoặc nội dung..."
                    value={threadSearch}
                    onChange={(e) => setThreadSearch(e.target.value)}
                    style={{
                      maxWidth: '380px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  />

                  {threads.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Link
                          href={`/threads/${t.id}`}
                          style={{
                            fontWeight: 700,
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                          }}
                        >
                          {t.isPinned ? '[PIN] ' : ''}
                          {t.isLocked ? '[LOCKED] ' : ''}
                          {t.title}
                        </Link>
                        <div
                          style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}
                        >
                          Net Score: {t.upvotesCount - t.downvotesCount} • Comments:{' '}
                          {t.commentCount}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="reddit-pill-btn"
                          onClick={() => void handleTogglePin(t)}
                        >
                          {t.isPinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                          type="button"
                          className="reddit-pill-btn"
                          onClick={() => void handleToggleLock(t)}
                        >
                          {t.isLocked ? 'Unlock' : 'Lock'}
                        </button>
                        <button
                          type="button"
                          className="reddit-pill-btn"
                          style={{ color: '#f43f5e' }}
                          onClick={() => void handleDeleteThread(t.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="reddit-card"
                  style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                  <input
                    type="text"
                    placeholder="Lọc theo Action (vd: RESOLVE_REPORT, UPDATE_USER_STATUS)..."
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    style={{
                      maxWidth: '400px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  />

                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '6px',
                        }}
                      >
                        <strong style={{ color: 'var(--color-brand)' }}>{log.action}</strong>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Actor: <strong>u/{log.actorUsername}</strong> • Target: {log.targetType} (
                        {log.targetId || 'N/A'}){log.ipAddress ? ` • IP: ${log.ipAddress}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <BottomNav />
      <FloatingChatWidget />
    </div>
  );
}
