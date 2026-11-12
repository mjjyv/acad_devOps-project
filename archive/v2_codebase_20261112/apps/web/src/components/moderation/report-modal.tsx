'use client';

import type React from 'react';
import { useState } from 'react';
import { CloseIcon } from '@/components/ui/icons';
import { ModerationApi } from '@/lib/api/moderation';
import { useUI } from '@/lib/store/ui-context';

interface ReportModalProps {
  isOpen: boolean;
  targetType: 'THREAD' | 'COMMENT';
  targetId: string;
  targetLabel?: string;
  onClose: () => void;
}

const PRESET_REASONS = [
  'Spam hoặc quảng cáo lặp lại',
  'Ngôn từ kích động / Quấy rối thành viên',
  'Rò rỉ thông tin nhạy cảm / API Key / Mật khẩu',
  'Nội dung sai sự thật hoặc lạc đề nghiêm trọng',
];

export function ReportModal({
  isOpen,
  targetType,
  targetId,
  targetLabel,
  onClose,
}: ReportModalProps) {
  const { showToast } = useUI();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (reason.trim().length < 3) {
      setErrorMsg('Vui lòng nhập lý do báo cáo tối thiểu 3 ký tự.');
      return;
    }

    try {
      setSubmitting(true);
      await ModerationApi.submitReport({
        targetType,
        targetId,
        reason: reason.trim(),
      });
      showToast('Đã gửi báo cáo vi phạm tới Moderation Queue');
      setReason('');
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể gửi báo cáo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 12, 20, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 130,
      }}
      onClick={onClose}
    >
      <div
        className="reddit-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '24px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Báo cáo vi phạm ({targetType === 'THREAD' ? 'Bài viết' : 'Bình luận'})
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
            aria-label="Đóng"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {targetLabel && (
          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginBottom: '12px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Đối tượng: {targetLabel}
          </p>
        )}

        {errorMsg && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(244, 63, 94, 0.14)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: '#f43f5e',
              fontSize: '12px',
              marginBottom: '12px',
            }}
          >
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {PRESET_REASONS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason(preset)}
              style={{
                padding: '5px 10px',
                borderRadius: '9999px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: reason === preset ? 'var(--color-brand)' : 'var(--bg-input)',
                color: reason === preset ? '#30364F' : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {preset}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <textarea
            rows={3}
            maxLength={255}
            required
            placeholder="Mô tả chi tiết lý do vi phạm (3 - 255 ký tự)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              resize: 'vertical',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="reddit-pill-btn" onClick={onClose}>
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || reason.trim().length < 3}
              className="reddit-pill-btn primary"
            >
              {submitting ? 'Đang gửi...' : 'Gửi Báo Cáo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
