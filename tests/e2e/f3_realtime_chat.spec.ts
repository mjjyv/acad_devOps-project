import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

const RUN_ID = Date.now();
const PROBE_USER_A = {
  username: `f3_probe_a_${RUN_ID}`,
  email: `f3_probe_a_${RUN_ID}@homelab.local`,
  password: 'Password!1234',
};
const PROBE_USER_B = {
  username: `f3_probe_b_${RUN_ID}`,
  email: `f3_probe_b_${RUN_ID}@homelab.local`,
  password: 'Password!1234',
};

const VALID_1X1_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aU3kAAAAASUVORK5CYII=',
  'base64',
);

test.describe('Phase F3 Realtime Chat Engine, Stranger Requests & Binary Media E2E', () => {
  test.afterAll(() => {
    try {
      execSync(
        `podman exec acad-postgres psql -U postgres -d acad_dev -c "DELETE FROM chat_messages WHERE sender_id IN (SELECT id FROM users WHERE username IN ('${PROBE_USER_A.username}', '${PROBE_USER_B.username}')); DELETE FROM chat_requests WHERE sender_id IN (SELECT id FROM users WHERE username IN ('${PROBE_USER_A.username}', '${PROBE_USER_B.username}')) OR recipient_id IN (SELECT id FROM users WHERE username IN ('${PROBE_USER_A.username}', '${PROBE_USER_B.username}')); DELETE FROM chat_channels WHERE creator_id IN (SELECT id FROM users WHERE username IN ('${PROBE_USER_A.username}', '${PROBE_USER_B.username}')); DELETE FROM users WHERE username IN ('${PROBE_USER_A.username}', '${PROBE_USER_B.username}');" && find .data/uploads -type f -name '*f3_probe*' -delete 2>/dev/null || true`,
        { stdio: 'pipe' },
      );
    } catch {
      // Best-effort cleanup
    }
  });

  test('Multi-User Realtime Chat: Register A & B -> Stranger Request -> Accept -> Live Messages & Presence -> Binary Image Upload -> Reply Thread -> Floating Widget & Profile CTA', async ({
    browser,
  }) => {
    // 1. Create two isolated browser contexts for User A and User B
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // 2. Register fresh blank User A
    await pageA.goto('/register');
    await pageA.locator('input[name="username"]').fill(PROBE_USER_A.username);
    await pageA.locator('input[name="email"]').fill(PROBE_USER_A.email);
    await pageA.locator('input[name="password"]').fill(PROBE_USER_A.password);
    await pageA.getByRole('button', { name: 'Đăng ký ngay' }).click();
    await expect(pageA).toHaveURL(/\/($|\?)/);

    // 3. Register fresh blank User B
    await pageB.goto('/register');
    await pageB.locator('input[name="username"]').fill(PROBE_USER_B.username);
    await pageB.locator('input[name="email"]').fill(PROBE_USER_B.email);
    await pageB.locator('input[name="password"]').fill(PROBE_USER_B.password);
    await pageB.getByRole('button', { name: 'Đăng ký ngay' }).click();
    await expect(pageB).toHaveURL(/\/($|\?)/);

    // 4. User A visits /u/[User B] profile and checks "Nhắn tin trực tiếp" CTA button
    await pageA.goto(`/u/${PROBE_USER_B.username}`);
    const directBtn = pageA.getByTestId('profile-direct-message-btn');
    await expect(directBtn).toBeVisible();

    // 5. User A navigates to dedicated /chat page
    await pageA.goto('/chat');
    await expect(pageA.getByTestId('chat-full-page')).toBeVisible();
    await expect(pageA.getByTestId('chat-welcome-placeholder')).toBeVisible();

    // 6. User A opens NewChatModal to send a Stranger Request to User B
    await pageA.getByTestId('new-chat-trigger-btn').click();
    await pageA.getByTestId('search-user-input').fill(PROBE_USER_B.username);

    const userItemB = pageA.getByTestId(`user-search-result-${PROBE_USER_B.username}`);
    await expect(userItemB).toBeVisible();
    await userItemB.click();

    await pageA
      .getByTestId('initial-message-input')
      .fill('Chào B, mình kết nối trao đổi về DevOps kiến trúc microservices nhé!');
    await pageA.getByTestId('submit-new-chat-btn').click();

    // 7. User B opens /chat and views incoming stranger request
    await pageB.goto('/chat');
    await expect(pageB.getByTestId('chat-full-page')).toBeVisible();

    await pageB.getByTestId('chat-tab-requests').click();
    const reqItem = pageB
      .locator('[data-testid^="incoming-request-"]')
      .filter({ hasText: `u/${PROBE_USER_A.username}` });
    await expect(reqItem).toBeVisible();
    await expect(reqItem).toContainText('Chào B, mình kết nối trao đổi');

    // 8. User B clicks "Chấp nhận"
    await reqItem.getByRole('button', { name: 'Chấp nhận' }).click();

    // User B is immediately placed into the newly created channel
    await expect(pageB.getByTestId('chat-messages-container')).toBeVisible();

    // 9. User A sees channel activated or selects channel
    await pageA.getByTestId('chat-tab-channels').click();
    const chanItemA = pageA.locator('[data-testid^="channel-item-"]').first();
    await expect(chanItemA).toBeVisible();
    await chanItemA.click();
    await expect(pageA.getByTestId('chat-messages-container')).toBeVisible();

    // 10. User A sends text message via SSE
    const textMsgA = `Tin nhắn SSE thử nghiệm thời gian thực ${RUN_ID}`;
    await pageA.getByTestId('chat-message-input').fill(textMsgA);
    await pageA.getByTestId('chat-send-btn').click();

    // User B receives the message without refreshing the page!
    await expect(pageB.getByTestId('chat-messages-container')).toContainText(textMsgA);

    // 11. User B uploads a real binary PNG image and sends it into the channel
    const uploadPromise = pageB.waitForResponse(
      (res) => res.url().includes('/api/v1/media/upload') && res.request().method() === 'PUT',
    );
    await pageB.getByTestId('chat-image-input').setInputFiles({
      name: `f3_probe_diagram_${RUN_ID}.png`,
      mimeType: 'image/png',
      buffer: VALID_1X1_PNG,
    });
    const uploadRes = await uploadPromise;
    expect(uploadRes.status()).toBe(200);

    const textMsgB = `Đây là sơ đồ kiến trúc hệ thống PNG ${RUN_ID}`;
    await pageB.getByTestId('chat-message-input').fill(textMsgB);
    await pageB.getByTestId('chat-send-btn').click();

    // User A receives text and verifies rendered image naturalWidth > 0
    await expect(pageA.getByTestId('chat-messages-container')).toContainText(textMsgB);
    const renderedImage = pageA.getByTestId('chat-message-image').first();
    await expect(renderedImage).toBeVisible();
    await expect
      .poll(async () => renderedImage.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);

    // 12. User A replies to the message creating a thread
    const targetMsgCard = pageA
      .locator('[data-testid^="chat-message-"]')
      .filter({ hasText: textMsgB });
    await targetMsgCard.getByTestId('chat-reply-btn').click();
    await expect(pageA.getByTestId('chat-reply-banner')).toBeVisible();

    const replyMsgA = `Xác nhận đã nhận sơ đồ, cấu trúc rất chi tiết! ${RUN_ID}`;
    await pageA.getByTestId('chat-message-input').fill(replyMsgA);
    await pageA.getByTestId('chat-send-btn').click();

    // Check reply appears in both views
    await expect(pageA.getByTestId('chat-messages-container')).toContainText(replyMsgA);
    await expect(pageB.getByTestId('chat-messages-container')).toContainText(replyMsgA);

    // 13. Test Floating Chat Widget on desktop
    await pageA.goto('/');
    await expect(pageA.getByTestId('floating-chat-docked')).toHaveCount(0);

    // Click Header Chat Button to toggle widget
    await pageA.getByTestId('header-chat-btn').click();
    await expect(pageA.getByTestId('floating-chat-docked')).toBeVisible();

    // Minimize widget
    await pageA
      .getByTestId('floating-chat-docked')
      .getByRole('button', { name: 'Thu nhỏ' })
      .click();
    await expect(pageA.getByTestId('floating-chat-minimized')).toBeVisible();

    // Restore docked widget
    await pageA.getByTestId('floating-chat-minimized').getByRole('button').click();
    await expect(pageA.getByTestId('floating-chat-docked')).toBeVisible();

    // Close widget
    await pageA.getByTestId('floating-chat-docked').getByRole('button', { name: 'Đóng' }).click();
    await expect(pageA.getByTestId('floating-chat-docked')).toHaveCount(0);

    // Clean up contexts
    await contextA.close();
    await contextB.close();
  });
});
