'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SessionInfo } from '@acad/contracts';
import { webAuth } from '../../../lib/auth-client';
import { useAuth } from '../../../contexts/auth-context';
import { Navbar } from '../../../components/navbar';

export default function SessionsManagementPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      setErrorMessage(null);
      const data = await webAuth.listSessions();
      setSessions(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tải danh sách phiên làm việc');
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/settings/sessions');
    } else if (isAuthenticated) {
      loadSessions();
    }
  }, [isLoading, isAuthenticated, router]);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      await webAuth.revokeSession(sessionId);
      setActionMessage('Đã thu hồi phiên đăng nhập thành công.');
      await loadSessions();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Thu hồi phiên thất bại');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm('Bạn có chắc chắn muốn đăng xuất khỏi tất cả các thiết bị khác?')) return;
    try {
      setLoadingSessions(true);
      await webAuth.revokeAllOtherSessions();
      setActionMessage('Đã đăng xuất khỏi tất cả các thiết bị khác.');
      await loadSessions();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng xuất hàng loạt thất bại');
    } finally {
      setLoadingSessions(false);
    }
  };

  const getDeviceIcon = (deviceInfo?: string) => {
    const info = (deviceInfo || '').toLowerCase();
    if (info.includes('mobile') || info.includes('android') || info.includes('iphone')) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      );
    }
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    );
  };

  const formatDeviceDetails = (session: SessionInfo) => {
    const raw = session.userAgent || '';
    let os = 'Thiết bị';
    let browser = 'Trình duyệt web';

    if (raw.includes('Windows')) os = 'Windows';
    else if (raw.includes('Macintosh') || raw.includes('Mac OS')) os = 'macOS';
    else if (raw.includes('Linux')) os = 'Linux';
    else if (raw.includes('Android')) os = 'Android';
    else if (raw.includes('iPhone') || raw.includes('iPad')) os = 'iOS';

    if (raw.includes('Edg/')) browser = 'Microsoft Edge';
    else if (raw.includes('Chrome/')) browser = 'Google Chrome';
    else if (raw.includes('Safari/') && !raw.includes('Chrome/')) browser = 'Apple Safari';
    else if (raw.includes('Firefox/')) browser = 'Mozilla Firefox';

    return { os, browser };
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5EFE3', color: '#4A4A4A' }}>
        <Navbar />
        <div style={{ maxWidth: '600px', margin: '6rem auto', textAlign: 'center', fontSize: '0.9rem', color: '#787774' }}>
          Đang nạp thông tin phiên...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5EFE3', color: '#4A4A4A' }}>
      <Navbar />

      <div style={{ maxWidth: '960px', margin: '2.5rem auto', padding: '0 1.5rem' }}>
        {/* BREADCRUMB */}
        <div style={{ fontSize: '0.82rem', color: '#787774', marginBottom: '1.25rem' }}>
          <Link href="/" style={{ color: '#787774', textDecoration: 'none' }}>
            Trang chủ
          </Link>
          <span style={{ margin: '0 0.5rem' }}>/</span>
          <span>Cài đặt</span>
          <span style={{ margin: '0 0.5rem' }}>/</span>
          <span style={{ color: '#12544F', fontWeight: 600 }}>Quản lý Phiên & Thiết bị</span>
        </div>

        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.75rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '1.65rem',
                fontWeight: 800,
                margin: '0 0 0.35rem 0',
                color: '#1E2328',
                letterSpacing: '-0.02em',
              }}
            >
              Quản Lý Phiên & Thiết Bị Đăng Nhập
            </h1>
            <p style={{ color: '#787774', fontSize: '0.875rem', margin: 0 }}>
              Tài khoản: <strong style={{ color: '#12544F' }}>{user?.username}</strong> ({user?.email})
            </p>
          </div>

          <button
            onClick={handleRevokeAll}
            disabled={loadingSessions || sessions.length === 0}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#FAF7F2',
              color: '#9F2F2D',
              border: '1px solid #FAD1D4',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
            <span>Đăng xuất tất cả thiết bị khác</span>
          </button>
        </div>

        {/* ALERTS */}
        {actionMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#EDF7ED',
              color: '#1E4620',
              borderRadius: '6px',
              border: '1px solid #C8E6C9',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
            }}
          >
            ✓ {actionMessage}
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#FDEBEC',
              color: '#9F2F2D',
              borderRadius: '6px',
              border: '1px solid #FAD1D4',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
            }}
          >
            ✕ {errorMessage}
          </div>
        )}

        {/* SESSIONS LIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {loadingSessions ? (
            <div
              style={{
                padding: '3rem',
                textAlign: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E6DFD5',
                color: '#787774',
              }}
            >
              Đang tải danh sách thiết bị...
            </div>
          ) : sessions.length === 0 ? (
            <div
              style={{
                padding: '3rem',
                textAlign: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E6DFD5',
                color: '#787774',
              }}
            >
              Không tìm thấy phiên đăng nhập nào.
            </div>
          ) : (
            sessions.map((session) => {
              const { os, browser } = formatDeviceDetails(session);
              const isRevoking = revokingId === session.sessionId;

              return (
                <div
                  key={session.sessionId}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E6DFD5',
                    padding: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '6px',
                        backgroundColor: session.isCurrent ? '#EAF2F1' : '#FAF7F2',
                        border: '1px solid',
                        borderColor: session.isCurrent ? 'rgba(18,84,79,0.2)' : '#E6DFD5',
                        color: session.isCurrent ? '#12544F' : '#787774',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {getDeviceIcon(session.userAgent || undefined)}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1E2328' }}>
                          {browser} trên {os}
                        </span>
                        {session.isCurrent && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.1rem 0.45rem',
                              backgroundColor: '#EAF2F1',
                              color: '#12544F',
                              borderRadius: '4px',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            Thiết bị này
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#787774', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <span>
                          IP: <strong style={{ fontFamily: 'var(--font-mono)', color: '#4A4A4A' }}>{session.ipAddress || '127.0.0.1'}</strong>
                        </span>
                        <span>
                          Khởi tạo:{' '}
                          <strong style={{ color: '#4A4A4A' }}>
                            {session.createdAt ? new Date(session.createdAt).toLocaleString('vi-VN') : 'Mới đây'}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {session.isCurrent ? (
                      <span style={{ fontSize: '0.8rem', color: '#12544F', fontWeight: 600 }}>Phiên hiện tại</span>
                    ) : (
                      <button
                        onClick={() => handleRevokeSession(session.sessionId)}
                        disabled={isRevoking}
                        style={{
                          padding: '0.4rem 0.85rem',
                          backgroundColor: '#FAF7F2',
                          color: '#9F2F2D',
                          border: '1px solid #FAD1D4',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        {isRevoking ? 'Đang thu hồi...' : 'Đăng xuất'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
