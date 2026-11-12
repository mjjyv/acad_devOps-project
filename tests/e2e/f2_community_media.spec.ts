import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

const RUN_ID = Date.now();
const PROBE_USER = {
  username: `f2_probe_${RUN_ID}`,
  email: `f2_probe_${RUN_ID}@homelab.local`,
  password: 'Password!1234',
};

const VALID_1X1_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aU3kAAAAASUVORK5CYII=',
  'base64',
);

test.describe('Phase F2 Real-User Community, Image Upload & ltree Comments E2E', () => {
  test.afterAll(() => {
    try {
      execSync(
        `podman exec acad-postgres psql -U postgres -d acad_dev -c "DELETE FROM threads WHERE author_id IN (SELECT id FROM users WHERE username = '${PROBE_USER.username}'); DELETE FROM users WHERE username = '${PROBE_USER.username}'; SELECT reconcile_platform_counters();" && find .data/uploads -type f -name '*f2_probe_diagram*' -delete 2>/dev/null || true && if [ -f deploy/seeds/003_voting_redis_seed.sh ]; then bash deploy/seeds/003_voting_redis_seed.sh; fi`,
        { stdio: 'pipe' },
      );
    } catch {
      // Best-effort cleanup
    }
  });

  test('Blank user: Home CTA -> Explore -> Topic filter -> Join Space -> Submit MEDIA PNG -> 10-Level ltree @mention, Collapse, Soft-Delete & Reload Persistence', async ({
    page,
  }) => {
    // 1. Register fresh blank user
    await page.goto('/register');
    await page.locator('input[name="username"]').fill(PROBE_USER.username);
    await page.locator('input[name="email"]').fill(PROBE_USER.email);
    await page.locator('input[name="password"]').fill(PROBE_USER.password);
    await page.getByRole('button', { name: 'Đăng ký ngay' }).click();
    await expect(page).toHaveURL(/\/($|\?)/);

    // 2. Open Home empty state -> follow Explore CTA
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await expect(page.getByTestId('home-empty-state')).toBeVisible();
    await page.getByTestId('home-empty-state').locator('a[href="/explore"]').click();
    await expect(page).toHaveURL(/\/explore/);

    // 3. Filter Explore by topic & join s/kubernetes
    await page.getByRole('button', { name: /Kubernetes Architecture/i }).click();
    await expect(page).toHaveURL(/topic=Kubernetes/);
    const k8sCard = page.getByTestId('explore-space-card-kubernetes');
    await expect(k8sCard).toBeVisible();
    await expect(page.getByTestId('explore-space-card-vozforums')).toHaveCount(0);

    await k8sCard.getByRole('button', { name: 'Tham gia' }).click();
    await expect(k8sCard.getByRole('button', { name: 'Đã tham gia' })).toBeVisible();

    // 4. Verify Home feed now populated for joined space
    await page.goto('/?tab=following');
    await expect(page.locator('main article').first()).toBeVisible();

    // 5. Open /s/kubernetes and jump to /submit?space=kubernetes
    await page.goto('/s/kubernetes');
    await expect(page.getByTestId('space-header-card')).toContainText('s/kubernetes');
    await page
      .getByTestId('space-header-card')
      .locator('a[href="/submit?space=kubernetes"]')
      .click();
    await expect(page).toHaveURL(/\/submit\?space=kubernetes/);

    // 6. Compose MEDIA thread with real binary PNG upload
    const postTitle = `F2 Real PNG Upload & Depth 8 ltree Verify ${RUN_ID}`;
    await page.getByRole('button', { name: 'Hình ảnh (MEDIA)' }).click();
    await page.locator('input[name="title"]').fill(postTitle);
    await page
      .locator('textarea[name="contentText"]')
      .fill('Verified binary PNG presign PUT upload and nested comments.');

    const uploadPromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/media/upload') && res.request().method() === 'PUT',
    );
    await page.getByTestId('media-file-input').setInputFiles({
      name: `f2_probe_diagram_${RUN_ID}.png`,
      mimeType: 'image/png',
      buffer: VALID_1X1_PNG,
    });
    const uploadRes = await uploadPromise;
    expect(uploadRes.status()).toBe(200);

    await expect(page.getByTestId('uploaded-media-preview').locator('img')).toBeVisible();

    await page.getByRole('button', { name: 'Đăng bài viết' }).click();
    await expect(page).toHaveURL(/\/threads\/[0-9a-f-]+/);

    // 7. Verify uploaded image renders on /threads/[id] with naturalWidth > 0
    const detailImg = page.getByTestId('thread-media-image').first();
    await expect(detailImg).toBeVisible();
    await expect
      .poll(async () => detailImg.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);

    // Save thread & check Saved tab later
    await page.getByRole('button', { name: 'Lưu bài' }).click();
    await expect(page.getByRole('button', { name: 'Đã lưu' })).toBeVisible();

    // 8. Build 10-level comment chain (depth 1 -> depth 8 capped Flat Reply)
    const rootMarker = `L0_ROOT_${RUN_ID}`;
    await page.locator('textarea[name="rootComment"]').fill(rootMarker);
    await page.getByRole('button', { name: 'Gửi bình luận' }).click();
    const l0Node = page.locator('[data-testid^="comment-node-"]', { hasText: rootMarker }).first();
    await expect(l0Node).toBeVisible();
    await expect(l0Node).toHaveAttribute('data-depth', '1');

    let currentNode = l0Node;
    for (let level = 1; level <= 9; level++) {
      const marker = `L${level}_NESTED_${RUN_ID}`;
      await currentNode.getByRole('button', { name: 'Trả lời' }).click();
      await currentNode.locator('textarea').fill(marker);
      await currentNode.getByRole('button', { name: 'Gửi phản hồi' }).click();
      const nextNode = page.locator('[data-testid^="comment-node-"]', { hasText: marker }).first();
      await expect(nextNode).toBeVisible();
      const expectedDepth = Math.min(1 + level, 8);
      await expect(nextNode).toHaveAttribute('data-depth', String(expectedDepth));
      if (level >= 8) {
        await expect(nextNode).toContainText('Flat Reply (Bậc 8)');
        await expect(nextNode).toContainText(`@${PROBE_USER.username}`);
      }
      currentNode = nextNode;
    }

    // 9. Upvote root comment L0
    await l0Node.getByRole('button', { name: 'Upvote bình luận' }).click();
    await expect(l0Node.locator('[data-testid^="comment-score-"]')).toHaveText('1');

    // 10. Collapse L0 hides L1, Expand reveals L1
    const l0TestId = await l0Node.getAttribute('data-testid');
    if (!l0TestId) throw new Error('Missing data-testid on root comment');
    const l0ById = page.getByTestId(l0TestId);
    const l1Node = page
      .locator('[data-testid^="comment-node-"]', { hasText: `L1_NESTED_${RUN_ID}` })
      .first();
    await l0ById.getByRole('button', { name: 'Thu gọn nhánh bình luận' }).click();
    await expect(l1Node).toHaveCount(0);
    await l0ById.getByRole('button', { name: 'Mở rộng nhánh bình luận' }).click();
    await expect(l1Node).toBeVisible();

    // 11. Soft-delete L1 while preserving descendants L2..L9 & active count = 9
    await l1Node.getByRole('button', { name: 'Xóa' }).click();
    await expect(page.getByText('[Bình luận đã bị tác giả xóa]').first()).toBeVisible();
    await expect(page.getByTestId('detail-comment-count')).toContainText('9 bình luận');
    await expect(
      page.locator('[data-testid^="comment-node-"]', { hasText: `L2_NESTED_${RUN_ID}` }).first(),
    ).toBeVisible();

    // 12. Reload page -> verify persistence across SSR/Client refresh
    await page.reload();
    await expect(page.getByTestId('detail-comment-count')).toContainText('9 bình luận');
    await expect(page.getByText('[Bình luận đã bị tác giả xóa]').first()).toBeVisible();
    await expect(
      page.locator('[data-testid^="comment-node-"]', { hasText: `L9_NESTED_${RUN_ID}` }).first(),
    ).toContainText('Flat Reply (Bậc 8)');
    await expect
      .poll(async () =>
        page
          .getByTestId('thread-media-image')
          .first()
          .evaluate((el) => (el as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);

    // 13. Check Saved tab on own profile /u/[username]
    await page.goto(`/u/${PROBE_USER.username}`);
    await page.getByRole('button', { name: 'Bài viết đã lưu' }).click();
    await expect(page.getByTestId('saved-threads-list')).toContainText(postTitle);
  });
});
