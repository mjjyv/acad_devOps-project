'use client';

import type { AdminStats } from '@acad/contracts';

interface AdminStatsGridProps {
  stats: AdminStats | null;
  loading: boolean;
  onOpenModQueue: () => void;
  onRefresh: () => void;
}

export function AdminStatsGrid({ stats, loading, onOpenModQueue, onRefresh }: AdminStatsGridProps) {
  if (loading && !stats) {
    return (
      <div
        className="surface-card"
        style={{ padding: '24px', color: 'var(--text-secondary)', fontSize: '13.5px' }}
      >
        Đang tải số liệu hệ thống...
      </div>
    );
  }

  if (!stats) {
    return (
      <div
        className="surface-card"
        style={{ padding: '24px', color: 'var(--color-danger)', fontSize: '13.5px' }}
      >
        Không thể tải thống kê hệ thống.
      </div>
    );
  }

  const cards = [
    {
      id: 'active-users',
      label: 'Tài khoản hoạt động',
      value: stats.activeUsersCount,
      color: 'var(--color-brand)',
      hint: 'Users trạng thái ACTIVE',
    },
    {
      id: 'active-sessions',
      label: 'Phiên đang mở',
      value: stats.activeSessionsCount,
      color: 'var(--color-success)',
      hint: 'Phiên chưa thu hồi & còn hạn',
    },
    {
      id: 'spaces-count',
      label: 'Không gian (Spaces)',
      value: stats.spacesCount,
      color: 'var(--text-primary)',
      hint: 'Tổng cộng đồng kỹ thuật',
    },
    {
      id: 'threads-count',
      label: 'Tổng bài viết',
      value: stats.threadsCount,
      color: 'var(--text-primary)',
      hint: 'TEXT, LINK & MEDIA',
    },
    {
      id: 'comments-count',
      label: 'Bình luận hiệu lực',
      value: stats.commentsCount,
      color: 'var(--text-primary)',
      hint: 'Không tính bình luận đã xóa mềm',
    },
    {
      id: 'pending-reports',
      label: 'Báo cáo chờ duyệt',
      value: stats.pendingReportsCount,
      color: stats.pendingReportsCount > 0 ? 'var(--color-warning)' : 'var(--color-success)',
      hint: 'Hàng đợi Mod Queue PENDING',
      clickable: true,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Chỉ Số Vận Hành Thời Gian Thực
        </h2>
        <button
          type="button"
          onClick={onRefresh}
          className="btn-ghost"
          style={{ fontSize: '12.5px', padding: '5px 12px' }}
        >
          Làm mới số liệu
        </button>
      </div>

      <div
        data-testid="admin-stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            data-testid={`stat-card-${card.id}`}
            className="surface-card"
            style={{
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: 'var(--shadow-sm)',
              borderColor:
                card.id === 'pending-reports' && stats.pendingReportsCount > 0
                  ? 'var(--color-warning)'
                  : 'var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {card.label}
            </span>
            <strong
              data-testid={`stat-value-${card.id}`}
              style={{ fontSize: '26px', fontWeight: 800, color: card.color, lineHeight: 1.15 }}
            >
              {card.value}
            </strong>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{card.hint}</span>
            {card.clickable && (
              <button
                type="button"
                onClick={onOpenModQueue}
                className="btn-ghost"
                style={{
                  marginTop: '4px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  alignSelf: 'flex-start',
                  color: 'var(--color-brand)',
                }}
              >
                Mở Mod Queue →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
