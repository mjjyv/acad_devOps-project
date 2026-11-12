'use client';

import type { SessionInfo } from '@acad/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { DeviceIcon, ShieldIcon } from '@/components/ui/icons';
import { getApiClient, logoutAllDevices } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';

export default function SessionsSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, openAuthModal, refreshProfile } = useAuth();
  const { showToast } = useUI();

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await getApiClient().getSessions();
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tải danh sách phiên đăng nhập');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void loadSessions();
  }, [authLoading, isAuthenticated, loadSessions]);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      await getApiClient().revokeSession(sessionId);
      setSessions((prev) => prev.filter((item) => item.id !== sessionId));
      showToast('Đã thu hồi phiên thiết bị', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Thu hồi phiên thất bại', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const handleLogoutAll = async () => {
    try {
      setRevokingAll(true);
      await logoutAllDevices();
      await refreshProfile();
      showToast('Đã đăng xuất toàn bộ thiết bị', 'success');
      router.push('/login');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Đăng xuất toàn bộ thất bại', 'error');
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <AppShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <section
          className="surface-card"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldIcon size={22} />
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Phiên đăng nhập & Thiết bị
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Quản lý Refresh Token đang hoạt động trên từng thiết bị của bạn.
              </p>
            </div>
          </div>

          {isAuthenticated && sessions.length > 0 && (
            <button
              type="button"
              onClick={() => void handleLogoutAll()}
              disabled={revokingAll}
              className="btn-ghost"
              style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
            >
              {revokingAll ? 'Đang xử lý...' : 'Đăng xuất tất cả thiết bị'}
            </button>
          )}
        </section>

        {!authLoading && !isAuthenticated && (
          <section
            className="surface-card"
            style={{
              padding: '28px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Bạn cần đăng nhập để xem và thu hồi các phiên thiết bị của mình.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-primary" onClick={() => openAuthModal('login')}>
                Đăng nhập ngay
              </button>
              <Link href="/login" className="btn-ghost" style={{ textDecoration: 'none' }}>
                Mở trang đăng nhập
              </Link>
            </div>
          </section>
        )}

        {isAuthenticated && loading && (
          <div className="surface-card" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Đang tải danh sách phiên hoạt động...
          </div>
        )}

        {isAuthenticated && !loading && errorMsg && (
          <div
            className="surface-card"
            role="alert"
            style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
          >
            {errorMsg}
          </div>
        )}

        {isAuthenticated && !loading && !errorMsg && sessions.length === 0 && (
          <div
            className="surface-card"
            style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}
          >
            Không có phiên hoạt động nào được ghi nhận.
          </div>
        )}

        {isAuthenticated &&
          !loading &&
          !errorMsg &&
          sessions.map((session) => (
            <article
              key={session.id}
              data-testid="session-item"
              className="surface-card"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-badge)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-brand)',
                    flexShrink: 0,
                  }}
                >
                  <DeviceIcon size={18} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
                  >
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                      {session.userAgent || 'Trình duyệt / Thiết bị không xác định'}
                    </strong>
                    {session.isCurrentSession && (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--bg-pill)',
                          color: 'var(--color-success)',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        Phiên hiện tại
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    IP: {session.ipAddress || 'unknown'} • Dấu vân tay:{' '}
                    <code>{session.deviceFingerprint || 'n/a'}</code>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Tạo lúc: {new Date(session.createdAt).toLocaleString()} • Hết hạn:{' '}
                    {new Date(session.expiresAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-ghost"
                disabled={revokingId === session.id}
                onClick={() => void handleRevokeSession(session.id)}
                style={{ fontSize: '12.5px', padding: '6px 12px' }}
              >
                {revokingId === session.id ? 'Đang thu hồi...' : 'Thu hồi'}
              </button>
            </article>
          ))}
      </div>
    </AppShell>
  );
}
