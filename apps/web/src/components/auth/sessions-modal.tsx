'use client';

import type { SessionInfo } from '@acad/contracts';
import { useEffect, useState } from 'react';
import { CloseIcon, ShieldIcon, TrashIcon } from '@/components/ui/icons';
import { getApiClient } from '@/lib/api/client';
import { useUI } from '@/lib/store/ui-context';

interface SessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionsModal({ isOpen, onClose }: SessionsModalProps) {
  const { showToast } = useUI();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    async function fetchSessions() {
      setLoading(true);
      try {
        const client = getApiClient();
        const res = await client.getSessions();
        if (mounted) {
          setSessions(res.sessions);
        }
      } catch {
        if (mounted) {
          showToast('Không thể tải danh sách phiên đăng nhập');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchSessions();

    return () => {
      mounted = false;
    };
  }, [isOpen, showToast]);

  if (!isOpen) return null;

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      const client = getApiClient();
      await client.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      showToast('Đã thu hồi phiên đăng nhập thành công');
    } catch {
      showToast('Thu hồi phiên thất bại');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(14, 17, 19, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          boxShadow: 'var(--shadow-floating)',
          position: 'relative',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldIcon size={22} style={{ color: 'var(--color-brand)' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Phiên Đăng Nhập & Bảo Mật Thiết Bị
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
            }}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Danh sách các thiết bị và trình duyệt đang duy trì phiên hoạt động với tài khoản của bạn.
          Bạn có thể thu hồi bất kỳ phiên khả nghi nào để ngăn chặn truy cập trái phép.
        </p>

        {/* Sessions List Container */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              Đang tải danh sách phiên bảo mật...
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              Chưa có phiên nào được ghi nhận.
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                    }}
                  >
                    <span
                      style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}
                    >
                      {session.userAgent
                        ? session.userAgent.length > 40
                          ? `${session.userAgent.slice(0, 40)}...`
                          : session.userAgent
                        : 'Thiết bị không xác định'}
                    </span>
                    {session.isCurrentSession && (
                      <span
                        style={{
                          backgroundColor: 'rgba(34, 197, 94, 0.15)',
                          color: 'var(--color-success)',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                        }}
                      >
                        Thiết bị hiện tại
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>IP: {session.ipAddress || '127.0.0.1'}</span>
                    <span>Tạo lúc: {new Date(session.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {!session.isCurrentSession && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(session.id)}
                    disabled={revokingId === session.id}
                    className="reddit-pill-btn"
                    style={{
                      height: '30px',
                      padding: '0 10px',
                      color: 'var(--color-danger)',
                      borderColor: 'var(--color-danger)',
                    }}
                  >
                    <TrashIcon size={14} />
                    <span>{revokingId === session.id ? 'Đang hủy...' : 'Thu hồi'}</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
