'use client';

import type { SessionInfo } from '@acad/contracts';
import { useCallback, useEffect, useState } from 'react';
import { FloatingChatWidget } from '@/components/chat/floating-chat-widget';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { ShieldIcon, TrashIcon } from '@/components/ui/icons';
import { getApiClient } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';

export default function SessionsSettingsPage() {
  const { user, isAuthenticated, isLoading: authLoading, openAuthModal } = useAuth();
  const { showToast } = useUI();

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!isAuthenticated) {
      setSessions([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await getApiClient().getSessions();
      setSessions(res.sessions);
    } catch {
      showToast('Không thể tải danh sách phiên đăng nhập');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, showToast]);

  useEffect(() => {
    if (!authLoading) {
      void fetchSessions();
    }
  }, [authLoading, fetchSessions]);

  const handleRevoke = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      await getApiClient().revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      showToast('Đã thu hồi phiên đăng nhập thành công');
    } catch {
      showToast('Không thể thu hồi phiên');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="app-shell">
      <Header />

      <div className="app-container">
        <LeftSidebar />

        <main className="main-content" style={{ maxWidth: '820px', width: '100%' }}>
          <div className="reddit-card" style={{ padding: '24px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}
            >
              <ShieldIcon size={22} style={{ color: 'var(--color-brand)' }} />
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Quản Lý Phiên Đăng Nhập Đa Thiết Bị
                </h1>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {user ? `Tài khoản u/${user.username} • ` : ''}
                  Theo dõi và thu hồi các Refresh Token đang hoạt động trên Redis & PostgreSQL
                </p>
              </div>
            </div>

            {authLoading || loading ? (
              <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Đang tải danh sách phiên...
              </div>
            ) : !isAuthenticated ? (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <p
                  style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}
                >
                  Vui lòng đăng nhập để quản lý các phiên thiết bị của bạn.
                </p>
                <button
                  type="button"
                  className="reddit-pill-btn primary"
                  onClick={() => openAuthModal('login')}
                >
                  Đăng nhập
                </button>
              </div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Không có phiên hoạt động nào được ghi nhận.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-input)',
                      border: s.isCurrentSession
                        ? '1px solid var(--color-brand)'
                        : '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                          {s.userAgent || 'Browser / API Session'}
                        </strong>
                        {s.isCurrentSession && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '9999px',
                              backgroundColor: 'var(--color-brand)',
                              color: '#30364F',
                            }}
                          >
                            Phiên hiện tại
                          </span>
                        )}
                      </div>
                      <div
                        style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}
                      >
                        IP: {s.ipAddress || 'unknown'} • Tạo lúc:{' '}
                        {new Date(s.createdAt).toLocaleString('vi-VN')} • Hết hạn:{' '}
                        {new Date(s.expiresAt).toLocaleString('vi-VN')}
                      </div>
                    </div>

                    {!s.isCurrentSession && (
                      <button
                        type="button"
                        disabled={revokingId === s.id}
                        onClick={() => void handleRevoke(s.id)}
                        className="reddit-pill-btn"
                        style={{ color: '#f43f5e' }}
                      >
                        <TrashIcon size={13} />
                        <span>{revokingId === s.id ? 'Đang thu hồi...' : 'Thu hồi'}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <BottomNav />
      <FloatingChatWidget />
    </div>
  );
}
