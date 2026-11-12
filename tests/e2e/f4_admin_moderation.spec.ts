import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

const RUN_ID = Date.now();
const PROBE_USER = {
  username: `f4_probe_${RUN_ID}`,
  email: `f4_probe_${RUN_ID}@homelab.local`,
  password: 'Password!1234',
};
const ADMIN_CREDS = {
  username: 'admin_pro',
  password: 'Password123!',
};

test.describe('Phase F4 Admin Console, RBAC, Moderation Queue & Audit Logs E2E', () => {
  test.afterAll(() => {
    try {
      execSync(
        `podman exec acad-postgres psql -U postgres -d acad_dev -c "DELETE FROM reports WHERE reporter_id IN (SELECT id FROM users WHERE username = '${PROBE_USER.username}'); DELETE FROM threads WHERE author_id IN (SELECT id FROM users WHERE username = '${PROBE_USER.username}'); DELETE FROM users WHERE username = '${PROBE_USER.username}'; SELECT reconcile_platform_counters();" && if [ -f deploy/seeds/003_voting_redis_seed.sh ]; then bash deploy/seeds/003_voting_redis_seed.sh; fi`,
        { stdio: 'pipe' },
      );
    } catch {
      // Best-effort cleanup; never touch admin_pro or immutable audit_logs
    }
  });

  test('Two-Actor RBAC, Report Flow (201/409), Admin Queue Resolve, Inline Pin/Lock/Delete, User Suspend+Revoke & Audit Logs', async ({
    browser,
  }) => {
    const contextUser = await browser.newContext();
    const pageUser = await contextUser.newPage();
    const contextAdmin = await browser.newContext();
    const pageAdmin = await contextAdmin.newPage();

    // 1. Unauthenticated access to /admin renders login guard and triggers zero admin API calls
    const unauthAdminCalls: string[] = [];
    pageUser.on('request', (req) => {
      if (req.url().includes('/api/v1/admin/')) {
        unauthAdminCalls.push(req.url());
      }
    });
    await pageUser.goto('/admin');
    await expect(pageUser.getByTestId('admin-unauthenticated-guard')).toBeVisible();
    expect(unauthAdminCalls).toEqual([]);

    // 2. Register fresh blank regular USER & capture real Bearer access token
    let userAuthHeader = '';
    pageUser.on('request', (req) => {
      const auth = req.headers().authorization;
      if (auth?.startsWith('Bearer ') && req.url().includes('/api/v1/')) {
        userAuthHeader = auth;
      }
    });
    await pageUser.goto('/register');
    await pageUser.locator('input[name="username"]').fill(PROBE_USER.username);
    await pageUser.locator('input[name="email"]').fill(PROBE_USER.email);
    await pageUser.locator('input[name="password"]').fill(PROBE_USER.password);
    await pageUser.getByRole('button', { name: 'Đăng ký ngay' }).click();
    await expect(pageUser).toHaveURL(/\/($|\?)/);

    // 3. Regular USER visiting /admin gets 403 UI guard with zero admin API requests from UI
    const userAdminCalls: string[] = [];
    pageUser.on('request', (req) => {
      if (req.url().includes('/api/v1/admin/')) {
        userAdminCalls.push(req.url());
      }
    });
    await pageUser.goto('/admin');
    await expect(pageUser.getByTestId('admin-forbidden-guard')).toBeVisible();
    await expect(pageUser.getByTestId('admin-console-page')).toHaveCount(0);
    expect(userAdminCalls).toEqual([]);

    // Direct backend RBAC check with real user Bearer token -> 403 Forbidden
    await expect.poll(() => userAuthHeader).toMatch(/^Bearer /);
    const directStatsRes = await pageUser.request.get('/api/v1/admin/stats', {
      headers: { Authorization: userAuthHeader },
    });
    expect(directStatsRes.status()).toBe(403);

    // 4. Regular USER creates a TEXT thread in s/kubernetes and reports it
    const threadTitle = `F4 Probe Thread ${RUN_ID}`;
    const reportReason = `F4 Probe Spam Report ${RUN_ID}`;
    await pageUser.goto('/submit?space=kubernetes');
    await pageUser.locator('input[name="title"]').fill(threadTitle);
    await pageUser
      .locator('textarea[name="contentText"]')
      .fill('E2E verification thread for Phase F4 moderation workflow.');
    await pageUser.getByRole('button', { name: 'Đăng bài viết' }).click();
    await expect(pageUser).toHaveURL(/\/threads\/[0-9a-f-]+/);

    const threadId = new URL(pageUser.url()).pathname.split('/threads/')[1] ?? '';
    expect(threadId).toMatch(/^[0-9a-f-]+$/);

    // Normal user must NOT see inline mod toolbar
    await expect(pageUser.getByTestId('thread-mod-toolbar')).toHaveCount(0);

    // Submit valid report -> 201
    await pageUser.getByRole('button', { name: 'Báo cáo' }).click();
    const reportDialog = pageUser.getByRole('dialog', { name: 'Báo cáo vi phạm' });
    await expect(reportDialog).toBeVisible();
    await reportDialog.locator('textarea').fill(reportReason);
    const reportCreateResPromise = pageUser.waitForResponse(
      (res) => res.url().includes('/api/v1/reports') && res.request().method() === 'POST',
    );
    await reportDialog.getByRole('button', { name: 'Gửi báo cáo' }).click();
    const reportCreateRes = await reportCreateResPromise;
    expect(reportCreateRes.status()).toBe(201);
    await expect(reportDialog).toHaveCount(0);

    // Duplicate report -> 409 Conflict surfaced cleanly in modal alert
    await pageUser.getByRole('button', { name: 'Báo cáo' }).click();
    await expect(reportDialog).toBeVisible();
    await reportDialog.locator('textarea').fill(`${reportReason} duplicate`);
    const reportDupResPromise = pageUser.waitForResponse(
      (res) => res.url().includes('/api/v1/reports') && res.request().method() === 'POST',
    );
    await reportDialog.getByRole('button', { name: 'Gửi báo cáo' }).click();
    const reportDupRes = await reportDupResPromise;
    expect(reportDupRes.status()).toBe(409);
    await expect(reportDialog.getByRole('alert')).toBeVisible();
    await reportDialog.getByRole('button', { name: 'Hủy' }).click();

    // Check My Reports tab on /u/[username] -> shows PENDING
    await pageUser.goto(`/u/${PROBE_USER.username}`);
    await pageUser.getByTestId('tab-my-reports').click();
    const myReportsList = pageUser.getByTestId('my-reports-list');
    await expect(myReportsList).toContainText(reportReason);
    await expect(myReportsList).toContainText('PENDING');

    // 5. Admin logs in as admin_pro -> /admin overview + resolve Mod Queue report
    await pageAdmin.goto('/login');
    await pageAdmin.locator('input[name="identifier"]').fill(ADMIN_CREDS.username);
    await pageAdmin.locator('input[name="password"]').fill(ADMIN_CREDS.password);
    await pageAdmin.locator('main').getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(pageAdmin).toHaveURL(/\/($|\?)/);

    await pageAdmin.goto('/admin');
    await expect(pageAdmin.getByTestId('admin-console-page')).toBeVisible();
    await expect(pageAdmin.getByTestId('admin-stats-grid')).toBeVisible();

    const pendingCountText = await pageAdmin
      .getByTestId('stat-value-pending-reports')
      .textContent();
    expect(Number(pendingCountText ?? '0')).toBeGreaterThanOrEqual(1);

    await pageAdmin.getByTestId('admin-tab-reports').click();
    await expect(pageAdmin.getByTestId('mod-queue-panel')).toBeVisible();

    const targetReportCard = pageAdmin
      .locator('[data-testid^="mod-report-item-"]')
      .filter({ hasText: reportReason })
      .first();
    await expect(targetReportCard).toBeVisible();
    await targetReportCard.locator('input[type="text"]').fill('Resolved in F4 E2E');
    await targetReportCard.getByRole('button', { name: 'Chấp thuận xử lý' }).click();
    await expect(targetReportCard).toHaveCount(0);

    // Regular user reloads My Reports tab -> report status is now RESOLVED
    await pageUser.reload();
    await pageUser.getByTestId('tab-my-reports').click();
    await expect(pageUser.getByTestId('my-reports-list')).toContainText(reportReason);
    await expect(pageUser.getByTestId('my-reports-list')).toContainText('RESOLVED');

    // 6. Admin inline Mod Toolbar on /threads/[id]: Pin + Lock
    await pageAdmin.goto(`/threads/${threadId}`);
    await expect(pageAdmin.getByTestId('thread-mod-toolbar')).toBeVisible();
    await pageAdmin.getByTestId('mod-pin-thread-btn').click();
    await expect(pageAdmin.getByTestId('thread-detail-card')).toContainText('Đã ghim');
    await pageAdmin.getByTestId('mod-lock-thread-btn').click();
    await expect(pageAdmin.getByTestId('thread-detail-card')).toContainText('Đã khóa bình luận');

    // Regular user sees pinned + locked state on thread detail
    await pageUser.goto(`/threads/${threadId}`);
    await expect(pageUser.getByTestId('thread-detail-card')).toContainText('Đã ghim');
    await expect(
      pageUser.getByText('Bài viết này đã bị khóa bình luận bởi quản trị viên.'),
    ).toBeVisible();

    // 7. Admin Content tab: search and hard-delete probe thread
    await pageAdmin.goto('/admin?tab=content');
    await expect(pageAdmin.getByTestId('admin-content-panel')).toBeVisible();
    await pageAdmin.getByTestId('admin-threads-search').fill(threadTitle);
    await pageAdmin.getByRole('button', { name: 'Tìm', exact: true }).click();

    const threadRow = pageAdmin.getByTestId(`admin-thread-row-${threadId}`);
    await expect(threadRow).toBeVisible();
    await pageAdmin.getByTestId(`admin-delete-thread-btn-${threadId}`).click();
    await pageAdmin.getByTestId(`admin-confirm-delete-thread-${threadId}`).click();
    await expect(threadRow).toHaveCount(0);

    // 8. Admin Users tab: Suspend & Revoke Sessions of PROBE_USER
    await pageAdmin.goto('/admin?tab=users');
    await expect(pageAdmin.getByTestId('admin-users-panel')).toBeVisible();
    await pageAdmin.getByTestId('admin-users-search').fill(PROBE_USER.username);
    await pageAdmin.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();

    const userRow = pageAdmin.getByTestId(`user-row-${PROBE_USER.username}`);
    await expect(userRow).toBeVisible();
    await pageAdmin
      .getByTestId(`user-status-select-${PROBE_USER.username}`)
      .selectOption('SUSPENDED');
    await pageAdmin.getByTestId(`user-status-save-${PROBE_USER.username}`).click();
    await expect(userRow).toContainText('SUSPENDED');

    await pageAdmin.getByTestId(`user-revoke-btn-${PROBE_USER.username}`).click();
    await expect(pageAdmin.getByTestId(`user-revoke-btn-${PROBE_USER.username}`)).toContainText(
      'Thu hồi phiên (0)',
    );

    // Regular user's existing refresh token is immediately invalidated on backend, and login is blocked while SUSPENDED
    const probeRefreshToken = await pageUser.evaluate(() =>
      localStorage.getItem('acad_refresh_token'),
    );
    expect(probeRefreshToken).toBeTruthy();
    const refreshAfterRevoke = await pageUser.request.post('/api/v1/auth/refresh', {
      data: { refreshToken: probeRefreshToken },
    });
    expect([401, 403]).toContain(refreshAfterRevoke.status());

    const suspendedLoginRes = await pageUser.request.post('/api/v1/auth/login', {
      data: { identifier: PROBE_USER.username, password: PROBE_USER.password },
    });
    expect(suspendedLoginRes.status()).toBe(403);

    // 9. Audit Logs tab: verify immutable audit entries exist
    await pageAdmin.goto('/admin?tab=audit');
    await expect(pageAdmin.getByTestId('audit-logs-panel')).toBeVisible();
    const auditPanel = pageAdmin.getByTestId('audit-logs-panel');
    await expect(auditPanel).toContainText('REPORT_RESOLVE');
    await expect(auditPanel).toContainText('THREAD_PIN');
    await expect(auditPanel).toContainText('THREAD_LOCK');
    await expect(auditPanel).toContainText('THREAD_DELETE');
    await expect(auditPanel).toContainText('USER_STATUS_CHANGE');
    await expect(auditPanel).toContainText('USER_SESSION_REVOKE');

    await contextUser.close();
    await contextAdmin.close();
  });
});
