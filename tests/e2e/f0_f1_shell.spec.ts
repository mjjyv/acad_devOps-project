import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

const RUN_ID = Date.now();
const PROBE_USER = {
  username: `f0f1_probe_${RUN_ID}`,
  email: `f0f1_probe_${RUN_ID}@homelab.local`,
  password: 'Password!1234',
};

test.describe('Phase F0-F1 Web Shell & Identity E2E (Real Blank User)', () => {
  test.afterAll(() => {
    try {
      execSync(
        `podman exec acad-postgres psql -U postgres -d acad_dev -c "DELETE FROM users WHERE username = '${PROBE_USER.username}';" && if [ -f deploy/seeds/003_voting_redis_seed.sh ]; then bash deploy/seeds/003_voting_redis_seed.sh; fi`,
        { stdio: 'pipe' },
      );
    } catch {
      // Best-effort cleanup if container is managed externally
    }
  });

  test('Blank user journey: Register -> Home Empty CTA -> Popular Vote + Reload Persistence -> Sessions -> Public Profile (no PII) -> Theme Toggle -> Logout', async ({
    page,
  }) => {
    // 1. Register brand-new blank user via /register UI
    await page.goto('/register');
    await page.locator('input[name="username"]').fill(PROBE_USER.username);
    await page.locator('input[name="email"]').fill(PROBE_USER.email);
    await page.locator('input[name="password"]').fill(PROBE_USER.password);
    await page.getByRole('button', { name: 'Đăng ký ngay' }).click();

    // Redirected to / and authenticated in Header
    await expect(page).toHaveURL(/\/($|\?)/);
    const accountMenuBtn = page.getByRole('button', { name: 'Mở menu tài khoản' });
    await expect(accountMenuBtn).toBeVisible();
    await expect(accountMenuBtn).toContainText(PROBE_USER.username);

    // 2. Switch to Home (?tab=following) and verify blank-user Empty-State CTA -> /explore
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await expect(page).toHaveURL(/tab=following/);
    const emptyState = page.getByTestId('home-empty-state');
    await expect(emptyState).toBeVisible();
    const exploreCta = emptyState.locator('a[href="/explore"]');
    await expect(exploreCta).toBeVisible();

    // 3. Switch to Popular (?tab=for_you) and verify real seeded threads render
    await page.getByRole('button', { name: 'Popular', exact: true }).click();
    await expect(page).toHaveURL(/tab=for_you/);
    const firstArticle = page.locator('main article').first();
    await expect(firstArticle).toBeVisible();

    // 4. Upvote first thread and assert persistence across hard reload()
    const scoreBadge = firstArticle.locator('[data-testid^="thread-score-"]');
    const initialScore = Number.parseInt(((await scoreBadge.textContent()) ?? '').trim(), 10);
    expect(Number.isNaN(initialScore)).toBe(false);

    const voteResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/threads/') && res.url().endsWith('/vote'),
    );
    await firstArticle.getByRole('button', { name: 'Upvote bài viết' }).click();
    const voteResponse = await voteResponsePromise;
    expect(voteResponse.status()).toBe(200);

    await expect(scoreBadge).toHaveText(String(initialScore + 1));

    // Reload browser page: must stay authenticated & keep updated score
    await page.reload();
    await expect(page.getByRole('button', { name: 'Mở menu tài khoản' })).toContainText(
      PROBE_USER.username,
    );
    const reloadedFirstScore = page
      .locator('main article')
      .first()
      .locator('[data-testid^="thread-score-"]');
    await expect(reloadedFirstScore).toHaveText(String(initialScore + 1));

    // 5. Verify /settings/sessions shows active session device
    await page.goto('/settings/sessions');
    const sessionItem = page.getByTestId('session-item').first();
    await expect(sessionItem).toBeVisible();
    await expect(sessionItem).toContainText('Phiên hiện tại');

    // 6. Verify /u/admin_pro public profile renders without leaking email PII
    await page.goto('/u/admin_pro');
    const profileCard = page.getByTestId('public-profile-card');
    await expect(profileCard).toBeVisible();
    await expect(profileCard).toContainText('u/admin_pro');
    await expect(profileCard).toContainText('ADMIN');
    const profileText = (await profileCard.textContent()) ?? '';
    expect(profileText).not.toContain('@');

    // 7. Verify Dark/Light theme toggle updates html[data-theme]
    const themeToggleBtn = page.getByRole('button', { name: 'Đổi chế độ giao diện sáng/tối' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await themeToggleBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await themeToggleBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // 8. Logout via User Menu dropdown
    await page.getByRole('button', { name: 'Mở menu tài khoản' }).click();
    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
  });
});
