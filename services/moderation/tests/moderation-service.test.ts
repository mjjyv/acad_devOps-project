import { describe, expect, it, vi } from 'vitest';
import {
  DuplicateReportError,
  InMemoryModerationRepository,
  ModerationService,
} from '../src/index.js';

describe('@acad/moderation-service Mod Queue, Session Revocation & Audit Logs', () => {
  it('prevents duplicate pending reports (409), resolves reports, revokes sessions on role/status change, and logs audit trail', async () => {
    const repo = new InMemoryModerationRepository();
    const revokeAllMock = vi.fn().mockResolvedValue(undefined);
    const mockSessionStore = {
      revokeAllUserSessions: revokeAllMock,
    } as unknown as NonNullable<ConstructorParameters<typeof ModerationService>[1]>;

    const mod = new ModerationService(repo, mockSessionStore);

    const adminId = 'a0000000-0000-0000-0000-000000000001';
    const userId = 'a0000000-0000-0000-0000-000000000002';
    const targetThreadId = 't0000000-0000-0000-0000-000000000001';

    repo.seedUser({
      id: userId,
      username: 'member1',
      email: 'm1@acad.vn',
      role: 'USER',
      status: 'ACTIVE',
      karmaScore: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const report = await mod.submitReport(userId, 'member1', {
      targetType: 'THREAD',
      targetId: targetThreadId,
      reason: 'Spam links detected',
    });
    expect(report.status).toBe('PENDING');

    await expect(
      mod.submitReport(userId, 'member1', {
        targetType: 'THREAD',
        targetId: targetThreadId,
        reason: 'Spam again',
      }),
    ).rejects.toThrow(DuplicateReportError);

    const resolved = await mod.resolveReport(adminId, 'admin_pro', report.id, {
      status: 'RESOLVED',
      note: 'Removed spam',
    });
    expect(resolved.status).toBe('RESOLVED');

    await mod.updateUserRole(adminId, 'admin_pro', userId, 'SPACE_MOD');
    await mod.updateUserStatus(adminId, 'admin_pro', userId, 'SUSPENDED', 'Abuse');
    expect(revokeAllMock).toHaveBeenCalledTimes(2);

    const logs = await mod.listAuditLogs();
    expect(logs.total).toBe(3);
    expect(logs.logs.map((l) => l.action)).toEqual([
      'USER_STATUS_CHANGE',
      'USER_ROLE_CHANGE',
      'REPORT_RESOLVE',
    ]);
  });
});
