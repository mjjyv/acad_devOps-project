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
    if (!confirm('Bạn có chắc chắn muốn đăng xuất khỏi tất cả các thiết bị?')) return;
    try {
      setLoadingSessions(true);
      await webAuth.revokeAllOtherSessions();
      setActionMessage('Đã thu hồi tất cả các phiên làm việc.');
      await loadSessions();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể thu hồi tất cả phiên');
    } finally {
      setLoadingSessions(false);
    }
  };

  const formatAgent = (ua?: string | null) => {
    if (!ua) return 'Thiết bị không xác định';
    if (ua.includes('iPhone') || ua.includes('Android')) return `📱 Di động (${ua.slice(0, 45)}...)`;
    if (ua.includes('Macintosh')) return `💻 Mac OS (${ua.slice(0, 45)}...)`;
    if (ua.includes('Windows')) return `🖥️ Windows (${ua.slice(0, 45)}...)`;
    if (ua.includes('Linux')) return `🐧 Linux (${ua.slice(0, 45)}...)`;
    return `🌐 ${ua.slice(0, 45)}...`;
  };

  if (isLoading || (!isAuthenticated && isLoading)) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0b0f17', color: '#f8fafc' }}>
        <Navbar />
        <div style={{ maxWidth: '900px', margin: '4rem auto', textAlign: 'center' }}>
          Đang xác thực tài khoản...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0b0f17', color: '#f8fafc' }}>
      <Navbar />

      <main style={{ maxWidth: '1000px', margin: '2.5rem auto', padding: '0 1.5rem' }}>
        {/* BREADCRUMB */}
        <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
          <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Trang chủ</Link>
          <span style={{ margin: '0 0.5rem' }}>/</span>
          <span>Cài đặt</span>
          <span style={{ margin: '0 0.5rem' }}>/</span>
          <span style={{ color: '#38bdf8' }}>Quản lý Phiên & Thiết bị</span>
        </div>

        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#f8fafc' }}>
              💻 Quản Lý Phiên & Thiết Bị Đăng Nhập
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
              Tài khoản: <strong style={{ color: '#38bdf8' }}>{user?.username}</strong> ({user?.email})
            </p>
          </div>

          <button
            onClick={handleRevokeAll}
            disabled={loadingSessions || sessions.length === 0}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#7f1d1d',
              color: '#fca5a5',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>⚠️</span>
            <span>Đăng xuất tất cả thiết bị khác</span>
          </button>
        </div>

        {/* ALERTS */}
        {actionMessage && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: '#064e3b',
              color: '#6ee7b7',
              borderRadius: '8px',
              border: '1px solid #059669',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
            }}
          >
            ✓ {actionMessage}
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: '#450a0a',
              color: '#fca5a5',
              borderRadius: '8px',
              border: '1px solid #ef4444',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
            }}
          >
            ✕ {errorMessage}
          </div>
        )}

        {/* SESSIONS LIST */}
        <div style={{ backgroundColor: '#131926', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden' }}>
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              Các thiết bị đang hoạt động ({sessions.length})
            </h2>
            <button
              onClick={loadSessions}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#38bdf8',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              🔄 Làm mới
            </button>
          </div>

          {loadingSessions ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              Đang tải danh sách thiết bị...
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              Không có phiên hoạt động nào được ghi nhận.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sessions.map((s, idx) => (
                <div
                  key={s.sessionId}
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: idx < sessions.length - 1 ? '1px solid #1e293b' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: '#1e293b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                      }}
                    >
                      💻
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>
                          {formatAgent(s.userAgent)}
                        </span>
                        {idx === 0 && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.15rem 0.5rem',
                              backgroundColor: '#065f46',
                              color: '#a7f3d0',
                              borderRadius: '9999px',
                              fontWeight: 700,
                            }}
                          >
                            Thiết bị này
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <span>📍 IP: <strong style={{ color: '#cbd5e1' }}>{s.ipAddress || '127.0.0.1'}</strong></span>
                        <span>Đăng nhập lúc: {new Date(s.createdAt).toLocaleString('vi-VN')}</span>
                        <span>Hết hạn: {new Date(s.expiresAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevokeSession(s.sessionId)}
                    disabled={revokingId === s.sessionId}
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: '6px',
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      border: '1px solid #7f1d1d',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {revokingId === s.sessionId ? 'Đang thu hồi...' : 'Đăng xuất thiết bị này'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
