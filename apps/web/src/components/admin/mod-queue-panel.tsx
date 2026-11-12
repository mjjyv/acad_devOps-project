'use client';

import type { ModReport, ModReportStatus, ModReportTargetType } from '@acad/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { extractApiErrorMessage } from '@/lib/api/client';
import { ModerationApi } from '@/lib/api/moderation';
import { useUI } from '@/lib/store/ui-context';
import { CheckIcon, CloseIcon, FlagIcon } from '../ui/icons';

interface ModQueuePanelProps {
  onResolved?: () => void;
}

export function ModQueuePanel({ onResolved }: ModQueuePanelProps) {
  const { showToast } = useUI();
  const [statusFilter, setStatusFilter] = useState<'ALL' | ModReportStatus>('PENDING');
  const [targetFilter, setTargetFilter] = useState<'ALL' | ModReportTargetType>('ALL');
  const [reports, setReports] = useState<ModReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await ModerationApi.getReports({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        targetType: targetFilter === 'ALL' ? undefined : targetFilter,
        limit: 30,
        offset: 0,
      });
      setReports(Array.isArray(res.reports) ? res.reports : []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, 'Không thể tải hàng đợi báo cáo vi phạm'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, targetFilter]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleResolve = async (reportId: string, status: 'RESOLVED' | 'DISMISSED') => {
    try {
      setBusyId(reportId);
      const note = noteMap[reportId]?.trim();
      const updated = await ModerationApi.resolveReport(reportId, {
        status,
        ...(note ? { note } : {}),
      });
      showToast(
        status === 'RESOLVED' ? 'Đã chấp thuận xử lý báo cáo' : 'Đã bác bỏ báo cáo',
        'success',
      );
      setReports((prev) =>
        statusFilter === 'ALL'
          ? prev.map((r) => (r.id === reportId ? updated : r))
          : prev.filter((r) => r.id !== reportId),
      );
      if (statusFilter !== 'ALL') {
        setTotal((t) => Math.max(0, t - 1));
      }
      if (onResolved) onResolved();
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Không thể cập nhật trạng thái báo cáo'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      data-testid="mod-queue-panel"
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      {/* Filters Header */}
      <div
        className="surface-card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <FlagIcon size={16} />
          <strong style={{ fontSize: '14px' }}>Hàng Đợi Báo Cáo ({total})</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {(['PENDING', 'RESOLVED', 'DISMISSED', 'ALL'] as const).map((st) => (
            <button
              key={st}
              type="button"
              data-testid={`mod-filter-status-${st}`}
              onClick={() => setStatusFilter(st)}
              className={statusFilter === st ? 'btn-primary' : 'btn-ghost'}
              style={{ padding: '5px 12px', fontSize: '12px' }}
            >
              {st === 'ALL'
                ? 'Tất cả'
                : st === 'PENDING'
                  ? 'Chờ duyệt'
                  : st === 'RESOLVED'
                    ? 'Đã xử lý'
                    : 'Đã bác bỏ'}
            </button>
          ))}

          <select
            aria-label="Lọc theo loại đối tượng"
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value as 'ALL' | ModReportTargetType)}
            className="input-field"
            style={{ width: 'auto', padding: '5px 10px', fontSize: '12.5px' }}
          >
            <option value="ALL">Mọi đối tượng</option>
            <option value="THREAD">Bài viết (THREAD)</option>
            <option value="COMMENT">Bình luận (COMMENT)</option>
          </select>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="surface-card"
          style={{
            borderColor: 'var(--color-danger)',
            color: 'var(--color-danger)',
            fontSize: '13px',
          }}
        >
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="surface-card" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Đang tải danh sách báo cáo...
        </div>
      ) : reports.length === 0 ? (
        <div
          data-testid="mod-queue-empty"
          className="surface-card"
          style={{ textAlign: 'center', padding: '28px', color: 'var(--text-secondary)' }}
        >
          Không có báo cáo nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {reports.map((report) => {
            const isPending = report.status === 'PENDING';
            return (
              <div
                key={report.id}
                data-testid={`mod-report-item-${report.id}`}
                className="surface-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '14px 16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
                  >
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--bg-pill)',
                        color: 'var(--color-brand)',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {report.targetType}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor:
                          report.status === 'PENDING'
                            ? 'rgba(253, 224, 71, 0.16)'
                            : report.status === 'RESOLVED'
                              ? 'rgba(134, 239, 172, 0.16)'
                              : 'var(--bg-subtle)',
                        color:
                          report.status === 'PENDING'
                            ? 'var(--color-warning)'
                            : report.status === 'RESOLVED'
                              ? 'var(--color-success)'
                              : 'var(--text-muted)',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {report.status}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Báo cáo bởi <strong>u/{report.reporterUsername}</strong>
                    </span>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      • {new Date(report.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {report.targetType === 'THREAD' ? (
                    <Link
                      href={`/threads/${report.targetId}`}
                      style={{ fontSize: '12px', color: 'var(--color-brand)' }}
                    >
                      Xem bài viết ({report.targetId.slice(0, 8)}...) →
                    </Link>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Target ID: {report.targetId}
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', margin: 0 }}>
                  <strong>Lý do:</strong> {report.reason}
                </p>

                {isPending && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '8px',
                      paddingTop: '6px',
                      borderTop: '1px solid var(--border-divider)',
                    }}
                  >
                    <input
                      type="text"
                      data-testid={`mod-report-note-${report.id}`}
                      value={noteMap[report.id] ?? ''}
                      onChange={(e) =>
                        setNoteMap((prev) => ({ ...prev, [report.id]: e.target.value }))
                      }
                      placeholder="Ghi chú kiểm duyệt (tùy chọn)..."
                      className="input-field"
                      style={{
                        flex: 1,
                        minWidth: '220px',
                        fontSize: '12.5px',
                        padding: '6px 10px',
                      }}
                    />
                    <button
                      type="button"
                      data-testid={`mod-resolve-btn-${report.id}`}
                      disabled={busyId === report.id}
                      onClick={() => void handleResolve(report.id, 'RESOLVED')}
                      className="btn-primary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckIcon size={14} />
                      <span>Chấp thuận xử lý</span>
                    </button>
                    <button
                      type="button"
                      data-testid={`mod-dismiss-btn-${report.id}`}
                      disabled={busyId === report.id}
                      onClick={() => void handleResolve(report.id, 'DISMISSED')}
                      className="btn-ghost"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CloseIcon size={14} />
                      <span>Bác bỏ</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
