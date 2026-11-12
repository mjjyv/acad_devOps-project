import { execSync } from 'node:child_process';
import { type BrowserContext, expect, type Page, test } from '@playwright/test';

const RUN_ID = Date.now();
const USER_A = {
  username: `fresh_a_${RUN_ID}`,
  email: `fresh_a_${RUN_ID}@homelab.local`,
  password: 'Password!1234',
};
const USER_B = {
  username: `fresh_b_${RUN_ID}`,
  email: `fresh_b_${RUN_ID}@homelab.local`,
  password: 'Password!1234',
};

async function registerViaUi(
  page: Page,
  account: { username: string; email: string; password: string },
) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await page.locator('#auth-username').fill(account.username);
  await page.locator('#auth-email').fill(account.email);
  await page.locator('#auth-password').fill(account.password);
  await page.getByRole('button', { name: 'Tạo Tài Khoản & Tiếp Tục' }).click();
  await expect(page.getByText(`u/${account.username}`).first()).toBeVisible();
}

test.describe('Real-User E2E Verification (Two Fresh Blank Accounts)', () => {
  test.afterAll(() => {
    try {
      execSync(
        `podman exec acad-postgres psql -U postgres -d acad_dev -c "DELETE FROM users WHERE username IN ('${USER_A.username}', '${USER_B.username}'); SELECT reconcile_platform_counters();" && bash deploy/seeds/003_voting_redis_seed.sh`,
        { stdio: 'pipe' },
      );
    } catch {
      // Best-effort DB cleanup if postgres container is managed externally
    }
  });

  test('Full two-user journey: Auth reload, Home/Popular/Explore/Topics, Vote/Comment DB persistence, and Cross-Account SSE Chat', async ({
    browser,
  }) => {
    const contextA: BrowserContext = await browser.newContext();
    const contextB: BrowserContext = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // 1. Fresh User A Registration & Reload Persistence
      await registerViaUi(pageA, USER_A);
      await pageA.reload();
      await expect(pageA.getByText(`u/${USER_A.username}`).first()).toBeVisible();

      // 2. Navigation: Home (empty) -> Explore -> Filter Topic -> Join Space -> Home (populated) -> Popular
      const sidebar = pageA.locator('aside.app-sidebar');
      await sidebar.getByRole('link', { name: 'Home', exact: true }).click();
      await expect(pageA).toHaveURL(/\/\?tab=following/);
      await expect(
        pageA
          .locator('main')
          .getByText('Bạn chưa tham gia không gian nào hoặc chưa có bài viết mới.'),
      ).toBeVisible();

      // Click Explore CTA inside Home empty state
      await pageA.getByRole('link', { name: 'Khám phá cộng đồng (Explore)' }).click();
      await expect(pageA).toHaveURL(/\/explore/);
      await expect(pageA.locator('main a[href="/s/kubernetes"]')).toBeVisible();
      await expect(pageA.locator('main a[href="/s/vozforums"]')).toBeVisible();

      // Click Topic link in LeftSidebar -> filters /explore?topic=...
      await sidebar.getByRole('link', { name: 'Kubernetes Architecture', exact: true }).click();
      await expect(pageA).toHaveURL(/\/explore\?topic=Kubernetes/);
      await expect(pageA.locator('main a[href="/s/kubernetes"]')).toBeVisible();
      await expect(pageA.locator('main a[href="/s/vozforums"]')).toHaveCount(0);

      // Join s/kubernetes
      const k8sCard = pageA.locator('main div.reddit-card', { hasText: 's/kubernetes' }).first();
      await k8sCard.getByRole('button', { name: 'Tham gia' }).click();
      await expect(k8sCard.getByRole('button', { name: 'Đã tham gia' })).toBeVisible();

      // Return to Home -> now shows s/kubernetes posts instead of empty CTA
      await sidebar.getByRole('link', { name: 'Home', exact: true }).click();
      await expect(pageA).toHaveURL(/\/\?tab=following/);
      await expect(pageA.locator('main a[href^="/threads/"]').first()).toBeVisible();

      // Click Popular -> loads global feed (?sort=hot)
      await sidebar.getByRole('link', { name: 'Popular', exact: true }).click();
      await expect(pageA.locator('main a[href^="/threads/"]').first()).toBeVisible();

      // 3. Open first thread -> Vote Up / Toggle / Down / Reload Persistence + Comment Create & Soft Delete
      const firstThreadLink = pageA.locator('main a[href^="/threads/"]').first();
      const targetHref = await firstThreadLink.getAttribute('href');
      expect(targetHref).toBeTruthy();
      await firstThreadLink.click();
      await expect(pageA).toHaveURL(new RegExp(targetHref ?? '/threads/'));

      const scoreBadge = pageA.locator('button[aria-label="Upvote"] + span');
      const initialScore = Number.parseInt(((await scoreBadge.textContent()) ?? '0').trim(), 10);

      // Upvote -> +1
      await pageA.locator('button[aria-label="Upvote"]').click();
      await expect(scoreBadge).toHaveText(String(initialScore + 1));

      // Click Upvote again -> toggle back to initial
      await pageA.locator('button[aria-label="Upvote"]').click();
      await expect(scoreBadge).toHaveText(String(initialScore));

      // Downvote -> -1 and reload to verify Redis/Postgres persistence
      await pageA.locator('button[aria-label="Downvote"]').click();
      await expect(scoreBadge).toHaveText(String(initialScore - 1));
      await pageA.reload();
      await expect(scoreBadge).toHaveText(String(initialScore - 1));

      // Toggle Downvote off so thread baseline stays clean
      await pageA.locator('button[aria-label="Downvote"]').click();
      await expect(scoreBadge).toHaveText(String(initialScore));

      // Create comment -> verify count increment & reload persistence -> Soft Delete
      const commentHeader = pageA.locator('h3', { hasText: /Bình Luận \(\d+\)/ });
      const headerMatch = ((await commentHeader.textContent()) ?? '').match(/\((\d+)\)/);
      const initialCommentCount = Number.parseInt(headerMatch?.[1] ?? '0', 10);

      const commentText = `Playwright E2E Verification Comment ${RUN_ID}`;
      await pageA.locator('textarea[placeholder*="ý kiến đóng góp"]').fill(commentText);
      await pageA.getByRole('button', { name: 'Gửi Bình Luận' }).click();
      await expect(pageA.getByText(commentText)).toBeVisible();
      await expect(commentHeader).toHaveText(`Bình Luận (${initialCommentCount + 1})`);

      await pageA.reload();
      await expect(pageA.getByText(commentText)).toBeVisible();
      await expect(commentHeader).toHaveText(`Bình Luận (${initialCommentCount + 1})`);

      // Delete own comment -> verifies active count drops back
      pageA.once('dialog', (dialog) => dialog.accept());
      const ownCommentCard = pageA.locator('div', { hasText: commentText }).filter({
        has: pageA.getByRole('button', { name: 'Xóa' }),
      });
      await ownCommentCard.first().getByRole('button', { name: 'Xóa' }).click();
      await expect(commentHeader).toHaveText(`Bình Luận (${initialCommentCount})`);

      // Verify Recent Posts widget in RightRail navigates back to the thread directly (not showToast)
      await pageA.goto('/explore');
      const recentPostLink = pageA.locator(`aside.app-right-rail a[href="${targetHref}"]`).first();
      await expect(recentPostLink).toBeVisible();
      await recentPostLink.click();
      await expect(pageA).toHaveURL(new RegExp(targetHref ?? '/threads/'));

      // 4. Register Fresh User B in isolated browser context B
      await registerViaUi(pageB, USER_B);

      // User A opens /chat from empty state, searches User B by username prefix & sends DM request
      await pageA.goto('/chat');
      await expect(pageA.getByRole('button', { name: /Kênh \(0\)/ })).toBeVisible();
      await pageA.getByRole('button', { name: '+ Tìm người để chat' }).click();

      const userSearchInput = pageA.getByPlaceholder(
        'Search for people by username to chat with them...',
      );
      await expect(userSearchInput).toBeVisible();
      await userSearchInput.fill('fresh_b_');

      const selectUserBtn = pageA.locator('button', { hasText: `u/${USER_B.username}` }).first();
      await expect(selectUserBtn).toBeVisible();
      await selectUserBtn.click();

      await pageA
        .getByPlaceholder('Lời chào / tin nhắn mở đầu...')
        .fill('Hello from Playwright fresh_a');
      await pageA.getByRole('button', { name: 'Gửi tin nhắn' }).click();

      // Verify A sees it in Requests -> Đã gửi (1)
      await expect(pageA.getByRole('button', { name: /Requests \(1\)/ })).toBeVisible();
      await expect(pageA.getByText(`Tới u/${USER_B.username}`, { exact: true })).toBeVisible();

      // User B opens Floating Chat Widget, sees incoming request via SSE/fetch & Accepts
      await pageB.locator('button[title="Open Realtime Chat"]').click();
      const requestsTabB = pageB.getByRole('button', { name: /Requests/ });
      await requestsTabB.click();
      await expect(pageB.getByText(`u/${USER_A.username}`).first()).toBeVisible();
      await expect(pageB.getByText('Hello from Playwright fresh_a').first()).toBeVisible();

      await pageB.getByRole('button', { name: 'Accept' }).click();
      await expect(pageB.getByRole('button', { name: 'Direct (1)' })).toBeVisible();
      await expect(pageB.getByText('Hello from Playwright fresh_a').first()).toBeVisible();

      // Tab-switch edge check in B: Groups (0) must NOT keep Direct channel selected
      await pageB.getByRole('button', { name: 'Groups (0)' }).click();
      await expect(pageB.getByText('Bạn chưa tham gia nhóm chat nào.')).toBeVisible();

      // Switch back to Direct (1) and reply to User A
      await pageB.getByRole('button', { name: 'Direct (1)' }).click();
      await pageB.getByPlaceholder('Nhập tin nhắn...').fill('Hi A realtime SSE reply');
      await pageB.getByRole('button', { name: 'Send', exact: true }).click();

      // User A switches to Kênh (1) on /chat (no reload!) and sees B's realtime SSE reply
      await pageA.getByRole('button', { name: /Kênh \(1\)/ }).click();
      await expect(pageA.getByText('Hi A realtime SSE reply').first()).toBeVisible();
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
