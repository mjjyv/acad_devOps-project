'use client';

import type { SessionInfo } from '@acad/contracts';
import { useCallback, useEffect, useState } from 'react';
import { getApiClient, logoutAllDevices } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';
import { CloseIcon, DeviceIcon } from '../ui/icons';

export function SessionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logout } = useAuth();
  const { showToast } = useUI();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getApiClient().getSessions();
      setSessions(Array.isArray(res.sessions) ? res.sessions : []);
    } catch {
      showToast('Không thể tải danh sách phiên làm việc', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (open) void loadSessions();
  }, [open, loadSessions]);

  if (!open) return null;

  const handleRevoke = async (sessionId: string) => {
    try {
      await getApiClient().revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      showToast('Đã thu hồi phiên làm việc thành công', 'success');
    } catch {
      showToast('Thu hồi phiên thất bại', 'error');
    }
  };

  const handleRevokeAll = async () => {
    try {
      await logoutAllDevices();
      onClose();
      await logout();
    } catch {
      showToast('Không thể đăng xuất toàn bộ thiết bị', 'error');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Phiên đăng nhập đang hoạt động"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(14, 17, 28, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="surface-card"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '80vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <DeviceIcon size={18} />
            <span>Thiết bị & Phiên làm việc</span>
          </h3>
          <button type="button" onClick={onClose} className="btn-ghost" style={{ padding: '6px' }}>
            <CloseIcon size={16} />
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Đang tải danh sách phiên...
          </p>
        ) : sessions.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Không có phiên nào đang hoạt động.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sessions.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>
                    {s.deviceFingerprint || 'Trình duyệt Web'}{' '}
                    {s.isCurrentSession ? '(Hiện tại)' : ''}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    IP: {s.ipAddress || 'N/A'} · Tạo: {new Date(s.createdAt).toLocaleString()}
                  </div>
                </div>
                <button type="button" onClick={() => void handleRevoke(s.id)} className="btn-ghost">
                  Thu hồi
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px' }}>
          <button
            type="button"
            onClick={() => void handleRevokeAll()}
            className="btn-ghost"
            style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
          >
            Đăng xuất tất cả thiết bị
          </button>
        </div>
      </div>
    </div>
  );
}
