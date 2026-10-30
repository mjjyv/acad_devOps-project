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
      setActionMessage('Đã đăng xuất khỏi tất cả các thiết bị khác thành công.');
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="5" y="2" width="14" height="20" rx="0" ry="0" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      );
    }
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="2" y="3" width="20" height="14" rx="0" ry="0" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    );
  };

  const formatDeviceDetails = (session: SessionInfo) => {
    const raw = session.userAgent || '';
    let os = 'Thiết bị không xác định';
    let browser = 'Trình duyệt web';

    if (raw.includes('Windows')) os = 'Windows OS';
    else if (raw.includes('Macintosh') || raw.includes('Mac OS')) os = 'macOS';
    else if (raw.includes('Linux')) os = 'Linux OS';
    else if (raw.includes('Android')) os = 'Android Device';
    else if (raw.includes('iPhone') || raw.includes('iPad')) os = 'Apple iOS';

    if (raw.includes('Edg/')) browser = 'Microsoft Edge';
    else if (raw.includes('Chrome/')) browser = 'Google Chrome';
    else if (raw.includes('Safari/') && !raw.includes('Chrome')) browser = 'Apple Safari';
    else if (raw.includes('Firefox/')) browser = 'Mozilla Firefox';

    return { os, browser };
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#222831', color: '#DFD0B8' }}>
        <Navbar />
        <div
          style={{
            maxWidth: '600px',
            margin: '6rem auto',
            textAlign: 'center',
            fontSize: '0.9rem',
            color: '#948979',
            fontFamily: 'var(--font-mono)',
          }}
        >
          &gt; Đang kiểm tra danh tính người dùng...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#222831', color: '#DFD0B8' }}>
      <Navbar />

      <div style={{ maxWidth: '1000px', margin: '2.5rem auto', padding: '0 1.5rem' }}>
        {/* BREADCRUMB */}
        <div
          style={{
            fontSize: '0.78rem',
            color: '#948979',
            marginBottom: '1.25rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <Link href="/" style={{ color: '#948979', textDecoration: 'none' }}>
            ACAD.DEVOPS
          </Link>
          <span style={{ margin: '0 0.5rem' }}>//</span>
          <span>SETTINGS</span>
          <span style={{ margin: '0 0.5rem' }}>//</span>
          <span style={{ color: '#DFD0B8', fontWeight: 800 }}>SESSIONS &amp; DEVICES</span>
        </div>

        {/* HEADER BAR */}
        <div
          style={{
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            padding: '1.5rem',
            boxShadow: '4px 4px 0px #948979',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.75rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#948979',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              MULTI-DEVICE TOKEN ROTATION //
            </div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 900,
                margin: '0.2rem 0',
                color: '#DFD0B8',
                fontFamily: 'var(--font-mono)',
              }}
            >
              QUẢN LÝ PHIÊN &amp; THIẾT BỊ ĐĂNG NHẬP
            </h1>
            <p style={{ color: '#948979', fontSize: '0.85rem', margin: 0 }}>
              Tài khoản: <strong style={{ color: '#DFD0B8' }}>{user?.username}</strong> ({user?.email}) | Mã hóa Scrypt KDF + Refresh Token Rotation
            </p>
          </div>

          <button
            onClick={handleRevokeAll}
            disabled={loadingSessions || sessions.length <= 1}
            style={{
              padding: '0.6rem 1.25rem',
              backgroundColor: '#222831',
              color: '#ff7777',
              border: '2px solid #948979',
              fontWeight: 800,
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
              cursor: loadingSessions || sessions.length <= 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '2px 2px 0px #948979',
            }}
          >
            [!] ĐĂNG XUẤT TẤT CẢ THIẾT BỊ KHÁC
          </button>
        </div>

        {/* FEEDBACK BANNERS */}
        {actionMessage && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: '#393E46',
              color: '#DFD0B8',
              border: '2px solid #948979',
              borderLeft: '6px solid #4E9F3D',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            [THÀNH CÔNG]: {actionMessage}
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: '#393E46',
              color: '#ff7777',
              border: '2px solid #948979',
              borderLeft: '6px solid #ff5555',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            [LỖI]: {errorMessage}
          </div>
        )}

        {/* SESSIONS LIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loadingSessions ? (
            <div
              style={{
                backgroundColor: '#393E46',
                border: '2px solid #948979',
                padding: '3rem',
                textAlign: 'center',
                color: '#948979',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.88rem',
              }}
            >
              &gt; Đang quét danh sách phiên làm việc bảo mật...
            </div>
          ) : sessions.length === 0 ? (
            <div
              style={{
                backgroundColor: '#393E46',
                border: '2px solid #948979',
                padding: '3rem',
                textAlign: 'center',
                color: '#948979',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.88rem',
              }}
            >
              [!] Không tìm thấy phiên đăng nhập nào đang hoạt động.
            </div>
          ) : (
            sessions.map((session) => {
              const { os, browser } = formatDeviceDetails(session);
              const isRevoking = revokingId === session.sessionId;

              return (
                <div
                  key={session.sessionId}
                  style={{
                    backgroundColor: '#393E46',
                    border: session.isCurrent ? '2px solid #DFD0B8' : '2px solid #948979',
                    padding: '1.25rem 1.5rem',
                    boxShadow: session.isCurrent ? '4px 4px 0px #DFD0B8' : '3px 3px 0px #948979',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        backgroundColor: '#222831',
                        border: '2px solid #948979',
                        color: session.isCurrent ? '#DFD0B8' : '#948979',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {getDeviceIcon(session.userAgent || undefined)}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            color: '#DFD0B8',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {browser} trên {os}
                        </span>

                        {session.isCurrent && (
                          <span
                            style={{
                              padding: '0.15rem 0.5rem',
                              backgroundColor: '#DFD0B8',
                              color: '#222831',
                              fontSize: '0.68rem',
                              fontWeight: 900,
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            THIẾT BỊ HIỆN TẠI NÀY
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: '#948979',
                          marginTop: '0.35rem',
                          fontFamily: 'var(--font-mono)',
                          display: 'flex',
                          gap: '1rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>IP: <strong style={{ color: '#DFD0B8' }}>{session.ipAddress || '127.0.0.1'}</strong></span>
                        <span>•</span>
                        <span>
                          Đăng nhập lúc: <strong style={{ color: '#DFD0B8' }}>{new Date(session.createdAt).toLocaleString('vi-VN')}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Hết hạn: <strong style={{ color: '#DFD0B8' }}>{new Date(session.expiresAt).toLocaleString('vi-VN')}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {session.isCurrent ? (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#DFD0B8',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                        }}
                      >
                        [PHIÊN ĐANG DÙNG]
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRevokeSession(session.sessionId)}
                        disabled={isRevoking}
                        style={{
                          padding: '0.45rem 0.95rem',
                          backgroundColor: '#222831',
                          color: '#ff7777',
                          border: '2px solid #948979',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          cursor: isRevoking ? 'not-allowed' : 'pointer',
                          boxShadow: '2px 2px 0px #948979',
                        }}
                      >
                        {isRevoking ? '[ ĐANG HỦY... ]' : '[ THU HỒI PHIÊN ]'}
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
