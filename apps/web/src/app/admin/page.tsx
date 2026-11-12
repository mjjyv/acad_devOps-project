'use client';

import type { AdminStats } from '@acad/contracts';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { AdminContentPanel } from '@/components/admin/admin-content-panel';
import { AdminStatsGrid } from '@/components/admin/admin-stats-grid';
import { AdminUsersPanel } from '@/components/admin/admin-users-panel';
import { AuditLogsPanel } from '@/components/admin/audit-logs-panel';
import { ModQueuePanel } from '@/components/admin/mod-queue-panel';
import { AppShell } from '@/components/layout/app-shell';
import { ActivityIcon, FlagIcon, LockIcon, ShieldIcon } from '@/components/ui/icons';
import { extractApiErrorMessage } from '@/lib/api/client';
import { ModerationApi } from '@/lib/api/moderation';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';

type AdminTabKey = 'overview' | 'reports' | 'users' | 'content' | 'audit';

const VALID_TABS: AdminTabKey[] = ['overview', 'reports', 'users', 'content', 'audit'];

function parseTab(raw: string | null): AdminTabKey {
  if (raw && VALID_TABS.includes(raw as AdminTabKey)) {
    return raw as AdminTabKey;
  }
  return 'overview';
}

function AdminConsoleContent() {
  const { user, isAuthenticated, isLoading: authLoading, requireAuth } = useAuth();
  const { showToast } = useUI();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseTab(searchParams.get('tab'));

  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'GLOBAL_MOD';

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadStats = useCallback(async () => {
    if (!isPrivileged) return;
    try {
      setStatsLoading(true);
      const data = await ModerationApi.getAdminStats();
      setStats(data);
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Không thể tải thống kê hệ thống'), 'error');
    } finally {
      setStatsLoading(false);
    }
  }, [isPrivileged, showToast]);

  useEffect(() => {
    if (isPrivileged) {
      void loadStats();
    }
  }, [isPrivileged, loadStats]);

  const handleTabChange = (tab: AdminTabKey) => {
    router.replace(tab === 'overview' ? '/admin' : `/admin?tab=${tab}`, { scroll: false });
  };

  if (authLoading) {
    return (
      <AppShell hideRightRail>
        <div
          className="surface-card"
          style={{ padding: '24px', color: 'var(--text-muted)', fontSize: '14px' }}
        >
          Đang xác thực quyền truy cập Admin Console...
        </div>
      </AppShell>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <AppShell hideRightRail>
        <section
          data-testid="admin-unauthenticated-guard"
          className="surface-card"
          style={{
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--color-brand)',
            }}
          >
            <LockIcon size={20} />
            <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
              Yêu cầu đăng nhập Quản trị viên
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            Vui lòng đăng nhập bằng tài khoản có vai trò ADMIN hoặc GLOBAL_MOD để truy cập Trung tâm
            Điều phối.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => requireAuth(() => {}, 'Đăng nhập tài khoản quản trị để tiếp tục')}
            >
              Đăng nhập ngay
            </button>
            <Link href="/" className="btn-ghost">
              Quay về Trang chủ
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }

  if (!isPrivileged) {
    return (
      <AppShell hideRightRail>
        <section
          data-testid="admin-forbidden-guard"
          className="surface-card"
          style={{
            padding: '28px',
            borderColor: 'var(--color-danger)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--color-danger)',
            }}
          >
            <ShieldIcon size={20} />
            <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
              403 — Không có quyền truy cập Admin Console
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            Tài khoản <strong>u/{user.username}</strong> hiện có vai trò <code>{user.role}</code>.
            Chỉ tài khoản <code>ADMIN</code> hoặc <code>GLOBAL_MOD</code> mới được phép sử dụng bảng
            điều phối kiểm duyệt.
          </p>
          <Link href="/" className="btn-primary" style={{ marginTop: '4px' }}>
            Quay về Trang chủ
          </Link>
        </section>
      </AppShell>
    );
  }

  const tabs: Array<{ key: AdminTabKey; label: string; icon?: React.ReactNode }> = [
    { key: 'overview', label: 'Tổng quan' },
    {
      key: 'reports',
      label:
        stats && stats.pendingReportsCount > 0
          ? `Hàng đợi báo cáo (${stats.pendingReportsCount})`
          : 'Hàng đợi báo cáo',
      icon: <FlagIcon size={14} />,
    },
    { key: 'users', label: 'Người dùng' },
    { key: 'content', label: 'Bài viết & Spaces' },
    { key: 'audit', label: 'Nhật ký kiểm toán', icon: <ActivityIcon size={14} /> },
  ];

  return (
    <AppShell hideRightRail wide>
      <div
        data-testid="admin-console-page"
        style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
      >
        <section
          className="surface-card"
          style={{
            padding: '20px 24px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            background:
              'linear-gradient(135deg, var(--bg-surface) 0%, rgba(99, 102, 241, 0.08) 100%)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--color-brand-secondary)',
              }}
            >
              <ShieldIcon size={22} />
              <h1
                style={{
                  fontSize: '21px',
                  fontWeight: 800,
                  margin: 0,
                  color: 'var(--text-primary)',
                }}
              >
                Admin Console & Moderation Hub
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)' }}>
              Điều phối báo cáo vi phạm, quản trị tài khoản, kiểm duyệt nội dung và truy vết Audit
              Logs bất biến.
            </p>
          </div>

          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '999px',
              backgroundColor: 'var(--bg-pill)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--color-brand-secondary)',
            }}
          >
            u/{user.username} · {user.role}
          </span>
        </section>

        <nav
          aria-label="Admin Console tabs"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            padding: '6px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                data-testid={`admin-tab-${tab.key}`}
                onClick={() => handleTabChange(tab.key)}
                className={active ? 'btn-primary' : 'btn-ghost'}
                style={{
                  fontSize: '13px',
                  padding: '7px 14px',
                  border: active ? undefined : '1px solid var(--border-subtle)',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {activeTab === 'overview' && (
          <AdminStatsGrid
            stats={stats}
            loading={statsLoading}
            onOpenModQueue={() => handleTabChange('reports')}
            onRefresh={() => void loadStats()}
          />
        )}
        {activeTab === 'reports' && <ModQueuePanel onResolved={() => void loadStats()} />}
        {activeTab === 'users' && <AdminUsersPanel currentUserId={user.id} />}
        {activeTab === 'content' && <AdminContentPanel />}
        {activeTab === 'audit' && <AuditLogsPanel />}
      </div>
    </AppShell>
  );
}

export default function AdminConsolePage() {
  return (
    <Suspense
      fallback={
        <AppShell hideRightRail>
          <div
            className="surface-card"
            style={{ padding: '24px', color: 'var(--text-muted)', fontSize: '14px' }}
          >
            Đang tải Admin Console...
          </div>
        </AppShell>
      }
    >
      <AdminConsoleContent />
    </Suspense>
  );
}
