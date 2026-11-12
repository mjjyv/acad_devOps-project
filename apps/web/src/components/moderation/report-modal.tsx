'use client';

import type { ModReportTargetType } from '@acad/contracts';
import { type FormEvent, useState } from 'react';
import { extractApiErrorMessage } from '@/lib/api/client';
import { ModerationApi } from '@/lib/api/moderation';
import { useUI } from '@/lib/store/ui-context';
import { CloseIcon, FlagIcon } from '../ui/icons';

interface ReportModalProps {
  open: boolean;
  targetType: ModReportTargetType;
  targetId: string | null;
  onClose: () => void;
}

const REPORT_PRESETS = [
  'Spam hoặc quảng cáo trái phép',
  'Ngôn từ kích động, quấy rối thành viên khác',
  'Nội dung vi phạm quy định cộng đồng / bảo mật',
  'Thông tin sai sự thật gây hiểu nhầm nghiêm trọng',
];

export function ReportModal({ open, targetType, targetId, onClose }: ReportModalProps) {
  const { showToast } = useUI();
  const [reason, setReason] = useState(REPORT_PRESETS[0] ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open || !targetId) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await ModerationApi.submitReport({
        targetType,
        targetId,
        reason: reason.trim(),
      });
      showToast('Đã gửi báo cáo tới hàng đợi kiểm duyệt', 'success');
      onClose();
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, 'Không thể gửi báo cáo vi phạm'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Báo cáo vi phạm"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        backgroundColor: 'rgba(14, 17, 28, 0.75)',
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
          maxWidth: '460px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FlagIcon size={16} />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Báo cáo {targetType === 'THREAD' ? 'bài viết' : 'bình luận'}
            </h2>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            aria-label="Đóng hộp thoại báo cáo"
            style={{ padding: '6px' }}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Chọn nhanh lý do
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {REPORT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    border:
                      reason === preset
                        ? '1px solid var(--border-focus)'
                        : '1px solid var(--border-subtle)',
                    backgroundColor:
                      reason === preset ? 'var(--bg-pill-hover)' : 'var(--bg-subtle)',
                    color: reason === preset ? 'var(--color-brand)' : 'var(--text-secondary)',
                    fontSize: '11.5px',
                    cursor: 'pointer',
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Chi tiết lý do vi phạm (3 – 255 ký tự)
            </span>
            <textarea
              required
              minLength={3}
              maxLength={255}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </label>

          {errorMsg && (
            <div
              role="alert"
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-danger)',
                color: 'var(--color-danger)',
                fontSize: '12.5px',
              }}
            >
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Đang gửi...' : 'Gửi báo cáo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
