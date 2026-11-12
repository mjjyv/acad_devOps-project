'use client';

import type { AuditLog } from '@acad/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { extractApiErrorMessage } from '@/lib/api/client';
import { ModerationApi } from '@/lib/api/moderation';
import { ActivityIcon } from '../ui/icons';

const AUDIT_ACTIONS = [
  'ALL',
  'REPORT_RESOLVE',
  'USER_ROLE_CHANGE',
  'USER_STATUS_CHANGE',
  'USER_SESSION_REVOKE',
  'SPACE_DELETE',
  'THREAD_PIN',
  'THREAD_UNPIN',
  'THREAD_LOCK',
  'THREAD_UNLOCK',
  'THREAD_DELETE',
] as const;

export function AuditLogsPanel() {
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await ModerationApi.getAuditLogs({
        action: actionFilter === 'ALL' ? undefined : actionFilter,
        limit,
        offset,
      });
      setLogs(Array.isArray(res.logs) ? res.logs : []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, 'Không thể tải nhật ký kiểm toán'));
    } finally {
      setLoading(false);
    }
  }, [actionFilter, offset]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <div
      data-testid="audit-logs-panel"
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ActivityIcon size={16} />
          <strong style={{ fontSize: '14px' }}>Nhật Ký Kiểm Toán Bất Biến ({total})</strong>
        </div>

        <select
          aria-label="Lọc theo hành động kiểm toán"
          data-testid="audit-action-filter"
          value={actionFilter}
          onChange={(e) => {
            setOffset(0);
            setActionFilter(e.target.value);
          }}
          className="input-field"
          style={{ width: 'auto', minWidth: '180px', fontSize: '12.5px', padding: '6px 10px' }}
        >
          {AUDIT_ACTIONS.map((act) => (
            <option key={act} value={act}>
              {act === 'ALL' ? 'Tất cả hành động' : act}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div
          className="surface-card"
          style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '13.5px' }}
        >
          Đang tải nhật ký kiểm toán...
        </div>
      )}

      {!loading && errorMsg && (
        <div
          className="surface-card"
          style={{
            padding: '16px',
            borderColor: 'var(--color-danger)',
            color: 'var(--color-danger)',
            fontSize: '13.5px',
          }}
        >
          {errorMsg}
        </div>
      )}

      {!loading && !errorMsg && logs.length === 0 && (
        <div
          className="surface-card"
          style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}
        >
          Chưa có bản ghi kiểm toán nào cho bộ lọc hiện tại.
        </div>
      )}

      {!loading && !errorMsg && logs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {logs.map((log) => {
            const metaText =
              log.metadata && Object.keys(log.metadata).length > 0
                ? JSON.stringify(log.metadata)
                : null;
            return (
              <article
                key={log.id}
                data-testid={`audit-log-row-${log.action}`}
                className="surface-card"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
                  >
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: 'var(--bg-pill)',
                        color: 'var(--color-brand)',
                      }}
                    >
                      {log.action}
                    </span>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      bởi{' '}
                      <Link
                        href={`/u/${log.actorUsername}`}
                        style={{
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          textDecoration: 'none',
                        }}
                      >
                        u/{log.actorUsername}
                      </Link>
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      → {log.targetType}
                      {log.targetId ? ` (${log.targetId.slice(0, 8)}...)` : ''}
                    </span>
                  </div>

                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {new Date(log.createdAt).toLocaleString('vi-VN')}
                    {log.ipAddress ? ` · IP ${log.ipAddress}` : ''}
                  </span>
                </div>

                {metaText && (
                  <code
                    style={{
                      display: 'block',
                      fontSize: '11.5px',
                      color: 'var(--text-secondary)',
                      backgroundColor: 'var(--bg-subtle)',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      overflowX: 'auto',
                    }}
                  >
                    {metaText}
                  </code>
                )}
              </article>
            );
          })}
        </div>
      )}

      {total > limit && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '6px',
          }}
        >
          <button
            type="button"
            disabled={offset === 0 || loading}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            className="btn-ghost"
            style={{ fontSize: '12.5px' }}
          >
            Trang trước
          </button>
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Trang {Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)}
          </span>
          <button
            type="button"
            disabled={offset + limit >= total || loading}
            onClick={() => setOffset((o) => o + limit)}
            className="btn-ghost"
            style={{ fontSize: '12.5px' }}
          >
            Trang sau
          </button>
        </div>
      )}
    </div>
  );
}
